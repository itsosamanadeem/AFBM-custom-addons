/** @odoo-module **/
import { Component } from "@odoo/owl";
import { registry } from "@web/core/registry";
// import { rpc } from "@web/core/network/rpc";
import { useService } from "@web/core/utils/hooks";

export class HideValue extends Component {
    static template = "om_hr_employee.HideValues";
    static props = {
        shift: { type: String, optional: true },
        readonly: { type: Boolean, optional: true, default: false },
        name: { type: String, optional: true },     
        record: { type: Object, optional: true },   
        start_time: { type: Number, optional: true },
        time_allocated: { type: Number, optional: true },
        end_time: { type: Number, optional: true },
    };

    setup() {
        // const newValue = parseFloat(event.target.value);
        this.rpc=useService("rpc")
        // if (this.props.record) {

        //     // console.log("Start time from record:", this.props.record.evalContext.id);
        // }
    }

    async updateStartTime(event) {
        const newValue = parseFloat(event.target.value);
        const recordId = this.props.record.evalContext.id;
        
            const response = await this.rpc("/update/employee/schedule", {
                recordId: recordId,
                newValue: newValue,
            });
            // console.log("Start time updated successfully:", response.updated_start_time);
            this.props.record.data.start_time = response.updated_start_time;
    }
}

export const hidevalue = {
    component: HideValue,
};
registry.category("fields").add("hide_value", hidevalue);
