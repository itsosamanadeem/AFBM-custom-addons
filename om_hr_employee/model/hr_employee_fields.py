from odoo import api, fields, models, _

class HrEmployee(models.Model):
    _inherit = "hr.employee"

    emp_id = fields.Text(string="Employee ID")
