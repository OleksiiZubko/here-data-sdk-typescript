/*
 * Copyright (C) 2020-2021 HERE Europe B.V.
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

import { assert } from "chai";
import { TileKey } from "@here/olp-sdk-core";

describe("TileKey", function() {
    it("largeNumberDivision", function() {
        // make sure that dividing by a large number by 2 actually produces correct results
        let x = Math.pow(2, 52);
        for (let i = 51; i > 0; --i) {
            x /= 2;
            assert.strictEqual(x, Math.pow(2, i), `power of ${i}`);
        }
    });

    it("getSubHereTile", function() {
        assert.strictEqual(
            "4",
            TileKey.fromRowColumnLevel(2, 2, 2).getSubHereTile(1)
        );
        assert.strictEqual(
            "5",
            TileKey.fromRowColumnLevel(2, 3, 2).getSubHereTile(1)
        );
        assert.strictEqual(
            "6",
            TileKey.fromRowColumnLevel(3, 2, 2).getSubHereTile(1)
        );
        assert.strictEqual(
            "7",
            TileKey.fromRowColumnLevel(3, 3, 2).getSubHereTile(1)
        );
    });

    it("toQuadKey", function() {
        assert.strictEqual(
            "30",
            TileKey.fromRowColumnLevel(2, 2, 2).toQuadKey()
        );
        assert.strictEqual(
            "31",
            TileKey.fromRowColumnLevel(2, 3, 2).toQuadKey()
        );
        assert.strictEqual(
            "32",
            TileKey.fromRowColumnLevel(3, 2, 2).toQuadKey()
        );
        assert.strictEqual(
            "33",
            TileKey.fromRowColumnLevel(3, 3, 2).toQuadKey()
        );
        assert.strictEqual(
            "1331132012123",
            TileKey.fromRowColumnLevel(3275, 8085, 13).toQuadKey()
        );
        assert.strictEqual(
            "-",
            TileKey.fromRowColumnLevel(0, 0, 0).toQuadKey()
        );
    });

    it("fromQuadKey", function() {
        assert.isTrue(
            TileKey.fromQuadKey("30").equals(
                TileKey.fromRowColumnLevel(2, 2, 2)
            )
        );
        assert.isTrue(
            TileKey.fromQuadKey("31").equals(
                TileKey.fromRowColumnLevel(2, 3, 2)
            )
        );
        assert.isTrue(
            TileKey.fromQuadKey("32").equals(
                TileKey.fromRowColumnLevel(3, 2, 2)
            )
        );
        assert.isTrue(
            TileKey.fromQuadKey("33").equals(
                TileKey.fromRowColumnLevel(3, 3, 2)
            )
        );
        assert.isTrue(
            TileKey.fromQuadKey("1331132012123").equals(
                TileKey.fromRowColumnLevel(3275, 8085, 13)
            )
        );
        assert.isTrue(
            TileKey.fromQuadKey("").equals(TileKey.fromRowColumnLevel(0, 0, 0))
        );
    });

    it("columnsAtLevel", function() {
        assert.strictEqual(8, TileKey.columnsAtLevel(3));
        assert.strictEqual(8192, TileKey.columnsAtLevel(13));
    });

    it("rowsAtLevel", function() {
        assert.strictEqual(8, TileKey.rowsAtLevel(3));
        assert.strictEqual(8192, TileKey.rowsAtLevel(13));
    });

    it("parent", function() {
        assert.isTrue(
            TileKey.fromRowColumnLevel(1637, 4042, 12).equals(
                TileKey.fromMortonCode(100000155).parent()
            )
        );
    });

    it("addedSubKey", function() {
        assert.isTrue(
            TileKey.fromRowColumnLevel(10, 15, 4).equals(
                TileKey.fromRowColumnLevel(2, 3, 2).addedSubKey("31")
            )
        );
    });

    it("changedLevelBy", function() {
        assert.isTrue(
            TileKey.fromRowColumnLevel(2, 3, 2).equals(
                TileKey.fromRowColumnLevel(2, 3, 2).changedLevelBy(0)
            )
        );
        assert.isTrue(
            TileKey.fromRowColumnLevel(40, 60, 6).equals(
                TileKey.fromRowColumnLevel(10, 15, 4).changedLevelBy(2)
            )
        );
        assert.isTrue(
            TileKey.fromRowColumnLevel(2, 3, 2).equals(
                TileKey.fromRowColumnLevel(10, 15, 4).changedLevelBy(-2)
            )
        );
    });

    it("fromMortonCode", function() {
        assert.isTrue(
            TileKey.fromRowColumnLevel(1637, 4042, 12).equals(
                TileKey.fromMortonCode(25000038)
            )
        );
        assert.isTrue(
            TileKey.fromRowColumnLevel(3275, 8085, 13).equals(
                TileKey.fromMortonCode(100000155)
            )
        );
    });

    it("rowCount", function() {
        assert.strictEqual(
            4096,
            TileKey.fromRowColumnLevel(1637, 4042, 12).rowCount()
        );
    });

    it("columnCount", function() {
        assert.strictEqual(
            8192,
            TileKey.fromRowColumnLevel(3275, 8085, 13).columnCount()
        );
    });

    it("toHereTile", function() {
        assert.strictEqual(
            "100000155",
            TileKey.fromRowColumnLevel(3275, 8085, 13).toHereTile()
        );
    });

    it("changedLevelTo", function() {
        assert.isTrue(
            TileKey.fromRowColumnLevel(6, 15, 4).equals(
                TileKey.fromRowColumnLevel(3275, 8085, 13).changedLevelTo(4)
            )
        );
    });

    it("fromHereTile", function() {
        assert.isTrue(
            TileKey.fromHereTile("100000155").equals(
                TileKey.fromRowColumnLevel(3275, 8085, 13)
            )
        );
    });

    it("parentMortonCode", function() {
        assert.strictEqual(25000038, TileKey.parentMortonCode(100000155));
    });

    it("addedSubHereTile", function() {
        assert.isTrue(
            TileKey.fromRowColumnLevel(49, 124, 7).equals(
                TileKey.fromRowColumnLevel(6, 15, 4).addedSubHereTile("82")
            )
        );
    });

    it("atCoords", function() {
        assert.isTrue(
            TileKey.fromRowColumnLevel(3, 6, 5).equals(
                TileKey.atCoords(5, 8.8, 6.486, 45, 55)
            )
        );
    });

    it("throws an error", function() {
        try {
            TileKey.fromRowColumnLevel(0, 0, 0).parent();
        } catch (error) {
            assert.equal(
                error.message,
                "Cannot get the parent of the root tile key"
            );
        }
    });

    it("Tile is not valid if the row/column is out of bounds", function() {
        const invalid_tile_1 = { row: 5, column: 1, level: 1 };
        assert.isFalse(TileKey.isValid(invalid_tile_1));

        const invalid_tile_2 = { row: -5, column: 1, level: 1 };
        assert.isFalse(TileKey.isValid(invalid_tile_2));

        const invalid_tile_3 = { row: 1, column: 5, level: 1 };
        assert.isFalse(TileKey.isValid(invalid_tile_3));

        const invalid_tile_4 = { row: 1, column: -5, level: 1 };
        assert.isFalse(TileKey.isValid(invalid_tile_4));
    });

    it("Tile is not valid if the level is out of bounds", function() {
        const invalid_tile_1 = { row: 0, column: 0, level: -1 };
        assert.isFalse(TileKey.isValid(invalid_tile_1));

        const invalid_tile_2 = { row: 0, column: 0, level: 100 };
        assert.isFalse(TileKey.isValid(invalid_tile_2));
    });
});
