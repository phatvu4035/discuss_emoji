from odoo import models, fields, api

class EmojiMessage(models.Model):
    _name='discuss.emoji_message'
    
    name=fields.Char(string='Message')
    emoji_id = fields.Many2one('discuss.emoji', ondelete='set null')
    message_id = fields.Many2one('mail.message', ondelete='cascade', required=True)
    emoji_owner_id = fields.Many2one('res.users', string='Emoji Owner', ondelete='cascade', required=True, auto_join=True, delegate=True)