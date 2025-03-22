/** @odoo-module **/
import { registry } from "@web/core/registry";
import { X2ManyField, x2ManyField } from "@web/views/fields/x2many/x2many_field";
import { useRef, useState } from "@odoo/owl";

export class One2ManyButtons extends X2ManyField {
    setup() {
        super.setup();
        this.dropdownMenu = useRef("dropdownMenu");  
        this.selectedOption = useState({ value: "Select Option" });
    }

    toggleDropdown() {
        const menu = this.dropdownMenu.el;
        if (menu) {
            menu.style.display = (menu.style.display === "block") ? "none" : "block";
        }
    }

    onOptionSelect(option) {
        this.selectedOption.value = option; 
        console.log("Selected Option:", option);
        const menu = this.dropdownMenu.el;
        if (menu) {
            menu.style.display = "none";
        }
    }
    onInputKeyUp() {
        var value = $(event.currentTarget).val().toLowerCase();
        $(".o_list_table tr:not(:lt(1))").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
        });
    }
}
One2ManyButtons.template = "One2ManyButtonsTemplate";
export const one2manybuttons = {
    ...x2ManyField,
    component: One2ManyButtons,
};
registry.category("fields").add("one2many_buttons", one2manybuttons);
