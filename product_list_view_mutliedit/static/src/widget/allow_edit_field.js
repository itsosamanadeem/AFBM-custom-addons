/** @odoo-module **/
import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

export class Edit_field_list_view extends Component {
    setup() {
        console.log("field is inherited");
        this.rpc = useService("rpc");
        this.orm = useService("orm");
        this.state = useState({
            standard_price: this.formatNumber(this.props.record.evalContext.standard_price),
            currency: "",
        });
        this.getCurrencySymbol(this.props.record.evalContext.currency_id);
    }

    formatNumber(value) {
        if (typeof value === "number") {
            return new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(value);
        }
        return value;
    }

    parseNumber(value) {
        return parseFloat(value.replace(/,/g, "")) || 0;
    }

    async getCurrencySymbol(currency_id) {
        if (currency_id) {
            try {
                const result = await this.rpc("/web/dataset/call_kw", {
                    model: "res.currency",
                    method: "read",
                    args: [[currency_id], ["symbol"]],
                    kwargs: {},
                });
                if (result.length > 0) {
                    this.state.currency = result[0].symbol;
                }
            } catch (error) {
                console.error("Error fetching currency symbol:", error);
            }
        }
    }

    async update_standard_price(ev) {
        let new_price = this.parseNumber(ev.target.value);
        this.state.standard_price = this.formatNumber(new_price); 

        try {
            await this.rpc("/web/dataset/call_kw", {
                model: "product.template",
                method: "write",
                args: [[this.props.record.data.id], { standard_price: new_price }],
                kwargs: {},
            });
            this.props.record.update({ standard_price: new_price });
            console.log("Standard Price Updated:", new_price);
        } catch (error) {
            console.error("Error updating standard_price:", error);
        }
    }
}

Edit_field_list_view.template = "product_list_view_mutliedit.allow_edit_field";

export const edit_field = {
    component: Edit_field_list_view,
};

registry.category("fields").add("allow_edit_field", edit_field);
