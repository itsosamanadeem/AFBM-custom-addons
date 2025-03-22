/** @odoo-module **/

import { Dialog } from "@web/core/dialog/dialog";
import { useState } from "@odoo/owl";

export class ProductPriceEditDialog extends Dialog {
    setup() {
        super.setup();
        this.state = useState({
            prices: Object.fromEntries(this.props.records.map((record) => [record.id, record.standard_price])),
        });
    }

    updatePrice(recordId, event) {
        this.state.prices[recordId] = event.target.value;
    }

    async savePrices() {
        const updatedPrices = Object.entries(this.state.prices).map(([id, price]) => ({
            id: parseInt(id),
            standard_price: parseFloat(price),
        }));

        this.props.onSave(updatedPrices);
        this.props.close();
    }

    render() {
        return this.env.qweb.renderToString("product_list_view_mutliedit.ProductPriceEditDialog", {
            records: this.props.records,
            updatePrice: this.updatePrice.bind(this),
            savePrices: this.savePrices.bind(this),
        });
    }
}
