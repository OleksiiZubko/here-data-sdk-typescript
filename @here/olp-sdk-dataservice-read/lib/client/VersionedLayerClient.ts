/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

import {
    ApiName,
    DataStoreRequestBuilder,
    FetchOptions,
    HRN,
    HttpError,
    OlpClientSettings,
    RequestFactory,
    STATUS_CODES
} from "@here/olp-sdk-core";
import { BlobApi, MetadataApi, QueryApi } from "@here/olp-sdk-dataservice-api";
import {
    DataRequest,
    getTile,
    MetadataCacheRepository,
    PartitionsRequest,
    QuadKeyPartitionsRequest,
    QuadTreeIndexRequest,
    QueryClient,
    TileRequest,
    TileRequestParams
} from "@here/olp-sdk-dataservice-read";
/**
 * Parameters for use to initialize VersionLayerClient.
 */
export interface VersionedLayerClientParams {
    /** The HRN of the catalog. */
    catalogHrn: HRN;
    /** The ID of the layer. */
    layerId: string;
    /** The [[OlpClientSettings]] instance. */
    settings: OlpClientSettings;
    /** The layer version. If it is not defined, the latest version is used. */
    version?: number;
}

/**
 * Describes a versioned layer and provides the possibility to get partitions metadata and data.
 */
export class VersionedLayerClient {
    private readonly apiVersion: string = "v1";

    /**
     * HRN of the catalog.
     */
    private hrn: string;

    /**
     * The ID of the layer.
     */
    private layerId: string;

    /**
     * The [[OlpClientSettings]] instance.
     */
    private settings: OlpClientSettings;

    // Layer version.
    private version?: number;

    /**
     * Creates the [[VersionedLayerClient]] instance with VersionedLayerClientParams.
     *
     * @param params parameters for use to initialize VersionLayerClient.
     */
    constructor(params: VersionedLayerClientParams) {
        this.hrn = params.catalogHrn.toString();
        this.layerId = params.layerId;
        this.settings = params.settings;

        if (params.version !== undefined && params.version >= 0) {
            this.version = params.version;
        }
    }

    /**
     * @brief Fetches data of a tile or its closest ancestor.
     * Use this API for tile-tree structures where children tile data is aggregated and stored in parent tiles.
     *
     * @param request The `TileRequest` instance that contains a complete set
     * of request parameters.
     * @param abortSignal A signal object that allows you to communicate with a request (such as the `fetch` request)
     * and, if required, abort it using the `AbortController` object.
     *
     * For more information, see the [`AbortController` documentation](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
     *
     * @return Tile data (if it exists) or the nearest parent tile data
     */
    async getAggregatedData(request: TileRequest, abortSignal?: AbortSignal) {
        let catalogVersion = this.version;

        if (catalogVersion === undefined) {
            catalogVersion = await this.getLatestVersion(
                request.getBillingTag()
            );
        }

        const params: TileRequestParams = {
            catalogHrn: HRN.fromString(this.hrn),
            layerId: this.layerId,
            layerType: "versioned",
            settings: this.settings,
            catalogVersion
        };

        return getTile(request, params, abortSignal);
    }

    /**
     * Fetches partition data using one of the following methods: ID, quadkey, or data handle.
     *
     * @param dataRequest The [[DataRequest]] instance of the configured request parameters.
     * @param abortSignal A signal object that allows you to communicate with a request (such as the `fetch` request)
     * and, if required, abort it using the `AbortController` object.
     *
     * For more information, see the [`AbortController` documentation](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
     *
     * @return The data from the requested partition.
     */
    async getData(
        dataRequest: DataRequest,
        abortSignal?: AbortSignal
    ): Promise<Response> {
        const dataHandle = dataRequest.getDataHandle();

        if (dataHandle) {
            return this.downloadPartition(
                dataHandle,
                abortSignal,
                dataRequest.getBillingTag()
            );
        }

        const partitionId = dataRequest.getPartitionId();

        if (this.version === undefined) {
            // fetch the latest version and lock it to the instance.
            this.version = await this.getLatestVersion(
                dataRequest.getBillingTag()
            ).catch(error => Promise.reject(error));
        }

        if (this.version === undefined) {
            return Promise.reject(
                new Error(
                    `Unable to retrieve latest version. Please provide version to the DataRequest or lock version in the constructor`
                )
            );
        }

        if (partitionId) {
            const partitionIdDataHandle = await this.getDataHandleByPartitionId(
                partitionId,
                dataRequest.getFetchOption(),
                dataRequest.getBillingTag()
            ).catch(error => Promise.reject(error));
            return this.downloadPartition(
                partitionIdDataHandle,
                abortSignal,
                dataRequest.getBillingTag()
            );
        }

        return Promise.reject(
            new Error(
                `No data provided. Add dataHandle, partitionId or quadKey to the DataRequest object`
            )
        );
    }

    /**
     * Fetches partitions metadata from the Query Service API using a quadkey.
     *
     * @param quadKeyPartitionsRequest The [[QuadKeyPartitionsRequest]] instance.
     * @param abortSignal A signal object that allows you to communicate with a request (such as the `fetch` request)
     * and, if required, abort it using the `AbortController` object.
     *
     * For more information, see the [`AbortController` documentation](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
     *
     * @returns The quadtree index for the requested partitions.
     */
    async getPartitions(
        quadKeyPartitionsRequest: QuadKeyPartitionsRequest,
        abortSignal?: AbortSignal
    ): Promise<QueryApi.Index>;

    /**
     * Fetches all partitions metadata from a layer using the partition ID from the [[PartitionsRequest]] instance.
     *
     * @param partitionsRequest The [[PartitionsRequest]] instance.
     * @param abortSignal A signal object that allows you to communicate with a request (such as the `fetch` request)
     * and, if required, abort it using the `AbortController` object.
     *
     * For more information, see the [`AbortController` documentation](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
     *
     * @returns A list of metadata for each of the partitions from the requested layer.
     *
     * If the partition IDs are not set, you get metadata from all of the partitions of the requested layer
     * from the Metadata Service API.
     * If the IDs are set, you get data from the Query Service API.
     */
    async getPartitions(
        partitionsRequest: PartitionsRequest,
        abortSignal?: AbortSignal
    ): Promise<MetadataApi.Partitions>;

    async getPartitions(
        request: QuadKeyPartitionsRequest | PartitionsRequest,
        abortSignal?: AbortSignal
    ): Promise<QueryApi.Index | MetadataApi.Partitions | QueryApi.Partitions> {
        if (this.version === undefined) {
            // fetch the latest version and lock it to the instance.
            this.version = await this.getLatestVersion(
                request.getBillingTag()
            ).catch(error => Promise.reject(error));
        }

        if (this.version === undefined) {
            return Promise.reject(
                new Error(
                    `Unable to retrieve latest version. Please provide version to the Request or lock version in the constructor`
                )
            );
        }

        if (request instanceof QuadKeyPartitionsRequest) {
            const quadKey = request.getQuadKey();
            if (!quadKey) {
                return Promise.reject(
                    new Error("Please provide correct QuadKey")
                );
            }

            const queryClient = new QueryClient(this.settings);

            const quadTreeIndexRequest = new QuadTreeIndexRequest(
                HRN.fromString(this.hrn),
                this.layerId,
                "versioned"
            )
                .withQuadKey(quadKey)
                .withVersion(this.version)
                .withDepth(request.getDepth())
                .withAdditionalFields(request.getAdditionalFields());

            return queryClient.fetchQuadTreeIndex(
                quadTreeIndexRequest,
                abortSignal
            );
        }

        if (request.getPartitionIds()) {
            const queryClient = new QueryClient(this.settings);
            return queryClient.getPartitionsById(
                request,
                this.layerId,
                HRN.fromString(this.hrn),
                abortSignal,
                this.version
            );
        }

        const cache = new MetadataCacheRepository(this.settings.cache);
        if (request.getFetchOption() !== FetchOptions.OnlineOnly) {
            const partitions = cache.get(
                request,
                this.hrn.toString(),
                this.layerId,
                this.version
            );
            if (partitions) {
                const additionalFields = request.getAdditionalFields();
                let existFields;
                if (additionalFields) {
                    existFields = additionalFields.filter(
                        (
                            field:
                                | "dataSize"
                                | "checksum"
                                | "compressedDataSize"
                                | "crc"
                        ) => {
                            return partitions.every(
                                partition => partition[field] !== undefined
                            );
                        }
                    );
                }
                if (
                    !additionalFields ||
                    !existFields ||
                    additionalFields.length === existFields.length
                ) {
                    return Promise.resolve({ partitions });
                }
            }
        }

        const metaRequestBilder = await this.getRequestBuilder(
            "metadata",
            HRN.fromString(this.hrn),
            abortSignal
        ).catch(error => Promise.reject(error));

        const metadata = await MetadataApi.getPartitions(metaRequestBilder, {
            version: this.version,
            layerId: this.layerId,
            additionalFields: request.getAdditionalFields(),
            billingTag: request.getBillingTag()
        }).catch(error => Promise.reject(error));

        if (
            request.getFetchOption() !== FetchOptions.OnlineOnly &&
            metadata.partitions.length
        ) {
            cache.put(
                request,
                this.hrn.toString(),
                this.layerId,
                metadata.partitions,
                this.version
            );
        }
        return Promise.resolve(metadata);
    }

    /**
     * Fetch and returns partition metadata
     * @param partitionId The name of the partition to fetch.
     * @param version The version of the layer to fetch
     * @param fetchOption The option of caching (online only or return from cache if exist)
     * @returns A promise of partition metadata which used to get partition data
     */
    private async getDataHandleByPartitionId(
        partitionId: string,
        fetchOption: FetchOptions,
        billingTag?: string
    ): Promise<string> {
        const queryClient = new QueryClient(this.settings);

        const partitionsRequest = new PartitionsRequest()
            .withPartitionIds([partitionId])
            .withFetchOption(fetchOption);

        if (billingTag) {
            partitionsRequest.withBillingTag(billingTag);
        }

        const metadata = await queryClient.getPartitionsById(
            partitionsRequest,
            this.layerId,
            HRN.fromString(this.hrn),
            undefined,
            this.version
        );
        return metadata.partitions &&
            metadata.partitions[0] &&
            metadata.partitions[0].dataHandle
            ? metadata.partitions[0].dataHandle
            : Promise.reject(
                  new HttpError(
                      STATUS_CODES.NOT_FOUND,
                      `No partition dataHandle for partition ${partitionId}. HRN: ${this.hrn}`
                  )
              );
    }

    /**
     * Gets the latest available catalog version what can be used as latest layer version
     */
    private async getLatestVersion(billingTag?: string): Promise<number> {
        const builder = await this.getRequestBuilder(
            "metadata",
            HRN.fromString(this.hrn)
        ).catch(error => Promise.reject(error));
        const latestVersion = await MetadataApi.latestVersion(builder, {
            startVersion: -1,
            billingTag
        }).catch(error => Promise.reject(error));
        return Promise.resolve(latestVersion.version);
    }

    private async downloadPartition(
        dataHandle: string,
        abortSignal?: AbortSignal,
        billingTag?: string
    ): Promise<Response> {
        const builder = await this.getRequestBuilder(
            "blob",
            HRN.fromString(this.hrn),
            abortSignal
        ).catch(error => Promise.reject(error));
        return BlobApi.getBlob(builder, {
            dataHandle,
            layerId: this.layerId,
            billingTag
        });
    }

    /**
     * Fetch baseUrl and create requestBuilder for sending requests to the API Lookup Service.
     * @param builderType endpoint name is needed to create propriate requestBuilder
     *
     * @returns requestBuilder
     */
    private async getRequestBuilder(
        builderType: ApiName,
        hrn?: HRN,
        abortSignal?: AbortSignal
    ): Promise<DataStoreRequestBuilder> {
        return RequestFactory.create(
            builderType,
            this.apiVersion,
            this.settings,
            hrn,
            abortSignal
        );
    }
}
