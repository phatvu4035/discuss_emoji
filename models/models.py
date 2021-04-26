# -*- coding: utf-8 -*-

from odoo import models, fields, api


class emoji(models.Model):
    _name = 'discuss.emoji'
    _description = 'Provide emoji'

    emoji_name = fields.Char(string='Emoji Name')
    emoji_code = fields.Char(string='Emoji code', required=True)
