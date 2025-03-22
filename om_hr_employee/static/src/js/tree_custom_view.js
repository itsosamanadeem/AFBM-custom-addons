/** @odoo-module **/

import { registry } from "@web/core/registry";
import { X2ManyField, x2ManyField } from "@web/views/fields/x2many/x2many_field";
import { ListRenderer } from "@web/views/list/list_renderer";
import { ListController } from "@web/views/list/list_controller";
import { useService } from "@web/core/utils/hooks";
import { Component, onWillStart, useState } from "@odoo/owl";
import { listView } from "@web/views/list/list_view";

export class CustomListRenderer extends ListRenderer {
    setup() {
        console.log("This is the widget inherited");
        this.rpc = useService("rpc");
        this.state = useState({
            data: [], 
        });
    }
}
CustomListRenderer.template = "om_hr_employee.CustomListRenderer";
export const customFieldOne2Many = {
    ...x2ManyField,
    ...listView,
    component: CustomListRenderer,
};

registry.category("fields").add("customtree", customFieldOne2Many);
