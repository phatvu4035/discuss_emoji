# -*- coding: utf-8 -*-
# from odoo import http


# class DiscussEmoji(http.Controller):
#     @http.route('/discuss_emoji/discuss_emoji/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/discuss_emoji/discuss_emoji/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('discuss_emoji.listing', {
#             'root': '/discuss_emoji/discuss_emoji',
#             'objects': http.request.env['discuss_emoji.discuss_emoji'].search([]),
#         })

#     @http.route('/discuss_emoji/discuss_emoji/objects/<model("discuss_emoji.discuss_emoji"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('discuss_emoji.object', {
#             'object': obj
#         })
