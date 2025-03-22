{
    'name': 'Product list view price edit',
    'category': 'Extra Tools',
    'summary': 'Quick Edit Feature For List View Fields In Odoo',
    'description': """This module enables users to change values of standard_price(technical name). The changes then will be set directly to the product form view.""",
    'author': 'Osama Nadeem',
    'company': 'Osama Nadeem',
    'maintainer': 'Osama Nadeem',
    'sequence': '-100',
    'depends': ['web','product','sale'],
    'data': [
        'views/product_list_view.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'product_list_view_mutliedit/static/src/widget/*.js',
            'product_list_view_mutliedit/static/src/widget/*.xml',
            'product_list_view_mutliedit/static/src/view/*/*.js',
            'product_list_view_mutliedit/static/src/view/*/*.xml',
        ],
    },
    'images': ['static/description/banner.png'],
    'license': 'AGPL-3',
    'installable': True,
    'auto_install': True,
    "application": True,
}
