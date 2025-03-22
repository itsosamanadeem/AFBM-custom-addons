{
    'name': 'One2many Button Widget',
    # 'version': '17.0.1.0.0',
    'category': 'Extra Tools',
    'summary': 'Quick Search Feature For One2many Fields In Odoo',
    'description': """This module enables users to search for text within
    One2many fields. The rows that match the search criteria will be displayed,
    while others will be hidden.""",
    'author': 'Cybrosys Techno Solutions',
    'company': 'Cybrosys Techno Solutions',
    'maintainer': 'Cybrosys Techno Solutions',
    # 'website': "https://www.cybrosys.com",
    'depends': ['web'],
    'assets': {
        'web.assets_backend': [
            'one2many_buttons_widget/static/src/css/header.css',
            'one2many_buttons_widget/static/src/fields/one2manybuttons/one2manybuttons.js',
            'one2many_buttons_widget/static/src/fields/one2manybuttons/one2manybuttons_template.xml',
        ],
    },
    # 'images': ['static/description/banner.png'],
    # 'license': 'AGPL-3',
    'installable': True,
    'auto_install': False,
    "application": False,
}
