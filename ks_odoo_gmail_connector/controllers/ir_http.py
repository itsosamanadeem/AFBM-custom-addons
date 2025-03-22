# -*- coding: utf-8 -*-

from odoo import models
from odoo.http import request
import time


class IrHttp(models.AbstractModel):
    _inherit = "ir.http"

    @classmethod
    def _authenticate(cls, endpoint):
        """For logging out to the users who don't have access token and refresh token."""
        res = super(IrHttp, cls)._authenticate(endpoint=endpoint)
        try:
            if request.env.user.logout:
                request.env.user.logout = False
                request.session.logout(keep_db=True)
        except:
            return res
        return res