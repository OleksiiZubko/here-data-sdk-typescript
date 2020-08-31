/*
 * Copyright (C) 2020 HERE Europe B.V.
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

/**
 * Cancels a versioned batch operation.
 */
export class CancelBatchRequest {
    private publicationId?: string;
    private billingTag?: string;

    /**
     * Sets the ID of the publication that you want to cancel.
     * 
     * @param id The ID of the publication.
     * 
     * @returns A reference to this object.
     */
    public withPublicationId(id: string): CancelBatchRequest {
        this.publicationId = id;
        return this;
    }

    /**
     * Sets the billing tag.
     * 
     * @param tag The free-form tag that is used for grouping billing records together.
     * If supplied, it must be 4–16 characters long and contain only alphanumeric ASCII characters [A–Za–z0–9].
     * 
     * @returns A reference to this object.
     */
    public withBillingTag(tag: string): CancelBatchRequest {
        this.billingTag = tag;
        return this;
    }

    /**
     * Gets the ID of the publication that you want to cancel.
     * 
     * @returns The ID of the publication.
     */
    public getPublicationId(): string | undefined {
        return this.publicationId;
    }

    /**
     * Gets the billing tag (if it was set).
     * 
     * @return The billing tag or `undefined` if it was not.
     */
    public getBillingTag(): string | undefined {
        return this.billingTag;
    }
}
