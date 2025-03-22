# -*- coding: utf-8 -*-

from odoo import fields, models


class IrModelFields(models.Model):
    _inherit = "ir.model.fields"

    ttype = fields.Selection(
        selection_add=[("job_serialized", "Job Serialized")],
        ondelete={"job_serialized": "cascade"},
    )
