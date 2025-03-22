{
    'name': 'Working Schedule',
    'summary': 'Manage and organize employee working schedules.',
    'description': """
        This module helps in managing and organizing employee working schedules, 
        providing tools for schedule creation, adjustment, and visualization.
    """,
    'author': 'Osama Nadeem',
    # 'website': 'https://www.yourcompany.com',
    # 'version': '17.0.1.2',  # Uncommented the version
    'category': 'Human Resources',
    'sequence': '-100',
    'license': 'LGPL-3',
    'depends': ['base', 'hr', 'resource', 'hr_recruitment','web'],
    'data': [
        'security/ir.model.access.csv',
        'view/hr_employee_views.xml',
        'view/menu_item_for_employee_schedule.xml',
        # 'view/inherit_custom_employee_schedule.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'om_hr_employee/static/src/*/*.js',
            'om_hr_employee/static/src/*/*.xml',
            'om_hr_employee/static/src/*/*.css',
        ],
    },
    'demo': [
        # 'demo/hr_employee_demo.xml'  Example of a demo file for initial data
    ],
    'installable': True,
    'application': True,
    'auto_install': True,
}
