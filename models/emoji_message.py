import json
from odoo import models, fields, api

class EmojiMessage(models.Model):
    _name='discuss.emoji_message'
    
    name=fields.Char(string='Message')
    emoji_id = fields.Many2one('discuss.emoji', ondelete='set null')
    message_id = fields.Many2one('mail.message', ondelete='cascade', required=True)
    emoji_owner_id = fields.Many2one('res.users', string='Emoji Owner', ondelete='cascade', required=True, auto_join=True, delegate=True)
    channel_id = fields.Many2one('mail.channel', string='Channel Message', ondelete='cascade', required=True)
    
    @api.model
    def create(self, vals_list):
        res = super(EmojiMessage, self).create(vals_list)
        channel = (self._cr.dbname, 'mail.channel', vals_list.get('channel_id'))
        emoji_code = res.emoji_id.emoji_code
        emoji_owner_name = res.emoji_owner_id.name
        bus_info = {
            'info': 'user_drop_emoji',
            'message_id': vals_list.get('message_id'),
            'partner_id': vals_list.get('emoji_owner_id'),
            'emoji_id': vals_list.get('emoji_id'),
            'channel_ids': [vals_list.get('channel_id')],
            'emoji_code': emoji_code,
            'emoji_owner_name': emoji_owner_name
        }
        self.env['bus.bus'].sudo().sendmany([[channel, bus_info]])
        return res