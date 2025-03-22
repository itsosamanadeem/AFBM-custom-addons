from odoo import models, fields, api
from odoo.exceptions import UserError
import logging
_logger = logging.getLogger(__name__)

class Connector(models.Model):
    _name="quickbook.connector"

    name= fields.Char(string="Name", tracking=True)
    client_id= fields.Char(string="Client ID", tracking=True)
    client_secert = fields.Char(string="Client Secert", tracking=True)
    redirect_url = fields.Char(string="Redirect URL", tracking=True)
    auth_code= fields.Char(string="Authorization Code", tracking=True)


    

