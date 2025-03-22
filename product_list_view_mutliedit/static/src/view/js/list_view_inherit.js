/** @odoo-module **/

import { registry } from "@web/core/registry";
import { ListController } from "@web/views/list/list_controller";
import { listView } from "@web/views/list/list_view";
import { onMounted } from "@odoo/owl";  // ✅ Import onMounted properly

class ProductListController extends ListController {
    setup() {
        super.setup();

        console.log(this.archInfo.columns.find((column) => column.name === "standard_price"));
    }
    onWillSaveMulti(editedRecord, changes, validSelectedRecords) {
        console.log("Calling Super onWillSaveMulti...");
        console.log( editedRecord, changes, validSelectedRecords );
    }
}

export const productListView = {
    ...listView,
    Controller: ProductListController,
    buttonTemplate: "product_list_view_mutliedit.list_view_inherit",
};

registry.category("views").add("product_product_multi_edit", productListView);

