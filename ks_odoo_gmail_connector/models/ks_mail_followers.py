# -*- coding: utf-8 -*-

from odoo import fields, models


class KsMailFollowers(models.Model):
    _inherit = "mail.followers"

    def _get_recipient_data(self, records, message_type, subtype_id, pids=None):
        recipients_data = super()._get_recipient_data(records, message_type, subtype_id, pids=pids)
        items = recipients_data.values()
        for value in items:
            p_items = value.values()
            for  p_val in p_items:
                p_val['type'] = 'customer'
                p_val['share'] = True
                p_val['uid'] = None
                p_val['groups'] = set()

        return recipients_data
