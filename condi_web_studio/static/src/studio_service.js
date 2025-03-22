/** @odoo-module **/
import {registry} from "@web/core/registry";
import {useService} from "@web/core/utils/hooks";

import {Component, useRef} from "@odoo/owl";
import {onWillStart} from "@odoo/owl";

class StudioSystray extends Component {

    get buttonDisabled1() {
        return this.studio.isStudioEditable();
    }

    get buttonDisabled() {
        return !this.studio.isStudioEditable();
    }

    setup() {
        const user = useService('user');
        this.user = useService("user");
        onWillStart(async () => {
            try {
                this.Manager = await this.user.hasGroup('condi_web_studio.group_condi_webstudio');
            } catch {
                this.Manager = false;
            }

        });
        this.hm = useService("home_menu");
        this.studio = useService("studio");
        this.rootRef = useRef("root");
        this.user = useService("user");
        this.env.bus.on("ACTION_MANAGER:UI-UPDATED", this, (mode) => {
            if (this.Manager && this.rootRef.el && mode !== "new") {

                this.rootRef.el.classList.toggle("o_disabled", this.buttonDisabled);
            }
        });
    }

    _onClick() {
        this.studio.open();
    }
}

StudioSystray.template = "web_studio.SystrayItem";

export const systrayItem = {
    Component: StudioSystray,
    isDisplayed: (env) => env.services.user.isSystem,
};

registry.category("systray").add("StudioSystrayItem", systrayItem, {sequence: 1});
