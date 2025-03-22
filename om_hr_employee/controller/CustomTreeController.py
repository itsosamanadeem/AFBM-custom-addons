from odoo.http import Controller, route, request
from odoo.exceptions import UserError
from odoo import http

class RequestEmployeeScheduleData(http.Controller):
    @route("/emp/data",methods=['POST'], type='json', auth="public", website=True, csrf=False )
    def emp_data(self):
        data=request.env['employee.working.schedule'].search([]).mapped('working_schedule_ids')
        result=[]
        for id in data:
            # val=id.schedule_id.id
            if id.schedule_id.id == 3:
                val={
                    "id":id.id,
                    # "schedule_id":id.schedule_id.id,
                    "name": id.name,
                    "day_of_week": id.day_of_week,
                    "shift": id.shift,
                    "start_time": id.start_time,
                    "end_time": id.end_time,
                }
                result.append(val)
        # raise UserError()
        return {'data': result}