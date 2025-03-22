/** @odoo-module **/
import { Component } from "@odoo/owl";
import { registry } from "@web/core/registry";
// import { ListRenderer } from "@web/views/list/list_renderer"
import { useService } from "@web/core/utils/hooks";

export class HideValue2 extends Component {
    static template = "om_hr_employee.HideValues2";
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
            
        //     console.log("Start time from record:", this.props.record.evalContext.id);
        // }
    }
    
    async updateEndTime(event) {
        const newValueEndTime = parseFloat(event.target.value);
        const recordId = this.props.record.evalContext.id;
        
        const response = await this.rpc("/update/employee/schedule/endtime", {
            recordId: recordId,
            newValueEndTime: newValueEndTime,
        });
        // console.log("Start time updated successfully:", response.updated_end_time);
        this.props.record.data.end_time = response.updated_end_time;
    }
}

export const hidevalue2 = {
    component: HideValue2,
};
registry.category("fields").add("hidevalue2", hidevalue2);
