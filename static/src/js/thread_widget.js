odoo.define('discuss_emoji.thread_message', function(require) {
	var DocumentViewer = require('mail.DocumentViewer');
	var mailUtils = require('mail.utils');
	
	var core = require('web.core');
	var time = require('web.time');
	var Widget = require('web.Widget');
	var session = require('web.session');
	console.log(session);
	
	var QWeb = core.qweb;
	var _t = core._t;
	var _lt = core._lt;
	
	var ORDER = {
	    ASC: 1, // visually, ascending order of message IDs (from top to bottom)
	    DESC: -1, // visually, descending order of message IDs (from top to bottom)
	};
	
	var READ_MORE = _lt("read more");
	var READ_LESS = _lt("read less");

	var MessageThread = require('mail.widget.Thread');
	MessageThread.include({
		events: {
	        'click a': '_onClickRedirect',
	        'click img': '_onClickRedirect',
	        'click strong': '_onClickRedirect',
	        'click .o_thread_show_more': '_onClickShowMore',
	        'click .o_attachment_download': '_onAttachmentDownload',
	        'click .o_attachment_view': '_onAttachmentView',
	        'click .o_attachment_delete_cross': '_onDeleteAttachment',
	        'click .o_thread_message_needaction': '_onClickMessageNeedaction',
	        'click .o_thread_message_star': '_onClickMessageStar',
	        'click .o_thread_message_reply': '_onClickMessageReply',
	        'click .oe_mail_expand': '_onClickMailExpand',
	        'click .o_thread_message': '_onClickMessage',
	        'click': '_onClick',
	        'click .o_thread_message_email_exception': '_onClickEmailException',
	        'click .o_thread_message_email_bounce': '_onClickEmailException',
	        'click .o_thread_message_moderation': '_onClickMessageModeration',
	        'change .moderation_checkbox': '_onChangeModerationCheckbox',
			/* Custom click for emoji */
			'click .show_discuss_emoji': '_onClickDiscussEmojiIcon',
			'click .o_message_emoji': '_onClickSelectMessageEmojiIcon'
	    },
		emoji_message_model: 'discuss.emoji_message',
		emoji_model: 'discuss.emoji',
		// emoji for message archive
		message_emoji_archive: {},
		
		// emoji list
		emojis: [],
		
		isAttacheTrigger: false,
		/**
	     * Hides the emojis container.
	     *
	     * @private
	     */
	    _hideEmojis: function () {
	        this._$emojisContainer.remove();
	    },
		 /**
		 * @override 
	     * @param {mail.model.AbstractThread} thread the thread to render.
	     * @param {Object} [options]
	     * @param {integer} [options.displayOrder=ORDER.ASC] order of displaying
	     *    messages in the thread:
	     *      - ORDER.ASC: last message is at the bottom of the thread
	     *      - ORDER.DESC: last message is at the top of the thread
	     * @param {boolean} [options.displayLoadMore]
	     * @param {Array} [options.domain=[]] the domain for the messages in the
	     *    thread.
	     * @param {boolean} [options.isCreateMode]
	     * @param {boolean} [options.scrollToBottom=false]
	     * @param {boolean} [options.squashCloseMessages]
	     */
	    render: function (thread, options) {
	        var self = this;
	
	        var shouldScrollToBottomAfterRendering = false;
	        if (this._currentThreadID === thread.getID() && this.isAtBottom()) {
	            shouldScrollToBottomAfterRendering = true;
	        }
	        this._currentThreadID = thread.getID();
	
	        // copy so that reverse do not alter order in the thread object
	        var messages = _.clone(thread.getMessages({ domain: options.domain || [] }));
	
	        var modeOptions = options.isCreateMode ? this._disabledOptions :
	                                                 this._enabledOptions;
	
	        // attachments ordered by messages order (increasing ID)
	        this.attachments = _.uniq(_.flatten(_.map(messages, function (message) {
	            return message.getAttachments();
	        })));
	
	        options = _.extend({}, modeOptions, options, {
	            selectedMessageID: this._selectedMessageID,
	        });
	
	        // dict where key is message ID, and value is whether it should display
	        // the author of message or not visually
	        var displayAuthorMessages = {};
	
	        // Hide avatar and info of a message if that message and the previous
	        // one are both comments wrote by the same author at the same minute
	        // and in the same document (users can now post message in documents
	        // directly from a channel that follows it)
	        var prevMessage;
	        _.each(messages, function (message) {
	            if (
	                // is first message of thread
	                !prevMessage ||
	                // more than 1 min. elasped
	                (Math.abs(message.getDate().diff(prevMessage.getDate())) > 60000) ||
	                prevMessage.getType() !== 'comment' ||
	                message.getType() !== 'comment' ||
	                // from a different author
	                (prevMessage.getAuthorID() !== message.getAuthorID()) ||
	                (
	                    // messages are linked to a document thread
	                    (
	                        prevMessage.isLinkedToDocumentThread() &&
	                        message.isLinkedToDocumentThread()
	                    ) &&
	                    (
	                        // are from different documents
	                        prevMessage.getDocumentModel() !== message.getDocumentModel() ||
	                        prevMessage.getDocumentID() !== message.getDocumentID()
	                    )
	                )
	            ) {
	                displayAuthorMessages[message.getID()] = true;
	            } else {
	                displayAuthorMessages[message.getID()] = !options.squashCloseMessages;
	            }
	            prevMessage = message;
	        });
	
	        if (modeOptions.displayOrder === ORDER.DESC) {
	            messages.reverse();
	        }
	
	        this.$el.html(QWeb.render('discuss_emoji.widget.Thread', {
	            thread: thread,
	            displayAuthorMessages: displayAuthorMessages,
	            options: options,
	            ORDER: ORDER,
	            dateFormat: time.getLangDatetimeFormat(),
	        }));
	
	        _.each(messages, function (message) {
	            var $message = self.$('.o_thread_message[data-message-id="'+ message.getID() +'"]');
	            $message.find('.o_mail_timestamp').data('date', message.getDate());
	
	            self._insertReadMore($message);
	        });
	
	        if (shouldScrollToBottomAfterRendering) {
	            this.scrollToBottom();
	        }
	
	        if (!this._updateTimestampsInterval) {
	            this.updateTimestampsInterval = setInterval(function () {
	                self._updateTimestamps();
	            }, 1000*60);
	        }

			console.log('render2', this)
	
	        this._renderMessageMailPopover(messages);
	        if (thread.hasSeenFeature()) {
	            this._renderMessageSeenPopover(thread, messages);
	        }
			this.getEmojiFromServer();
			// Only render when current thread is not mailbox_inbox
			if(this._currentThreadID != 'mailbox_inbox') {
				this.update_message_emoji_thread();
			}
			console.log('_currentThreadID', this._currentThreadID)
			if(!this.isAttacheTrigger) {
				this.call('mail_service', 'getMailBus').on('user_drop_emoji', this, this._onUserDropEmoji);
				this.isAttacheTrigger = true;
			}
			
	    },
		_onClickDiscussEmojiIcon: function(ev) {
			var self = this;
			var mail_discussion = $(ev.target).parents('.o_mail_discussion');
			if (!this._$emojisContainer) { // lazy rendering
	            this._$emojisContainer = $(QWeb.render('discuss_emoji.Composer.emojis', {
	                emojis: self.emojis,
	            }));
	        }
	        if (this._$emojisContainer.parent().length) {
	            this._hideEmojis();
	        } else {
	            this._$emojisContainer.appendTo($('.ta',mail_discussion));
	        }
		},
		
		_onClickSelectMessageEmojiIcon: function(ev) {
			console.log('_onClickMessageEmojiIcon')
			var target_icon = $(ev.target);
			var emoji_id = target_icon.attr('emoji-id');
			var message_id = target_icon.parents('.o_mail_discussion').data('message-id')
			var user_id = session.uid;
			console.log('user drop emoji', emoji_id, message_id, user_id)
			this.sendEmojiToServer(user_id, emoji_id, message_id)
			
		},
		/**
		* This is when user drop emoji
		/*/
		sendEmojiToServer: function(sent_user_id, emoji_id, message_id) {
			var self = this;
			var thread_id = self._currentThreadID;
			// Check if user drop emoji for message
			this._rpc({
                model: self.emoji_message_model,
                method: 'search_read',
                fields: [ 'emoji_id', 'message_id', 'emoji_owner_id'],
				domain: [['emoji_owner_id', '=', sent_user_id], ['message_id', '=', message_id], ['emoji_id', '=', emoji_id]]
            }).then(function(result) {
				console.log('result', result);
				if(result.length == 0) {
					var vals = {
						name: emoji_id + '-' +message_id + '-' + sent_user_id,
						emoji_id: parseInt(emoji_id),
						message_id: message_id,
						emoji_owner_id: sent_user_id,
						channel_id: thread_id
					}
					self._rpc({
		                model: self.emoji_message_model,
		                method: 'create',
		                args: [vals],
		            }).then(function() {
						// Update value for message emoji archive
						var emojis = self.emojis;
						var filtered_icons = emojis.filter(function(icon) {
							return icon.id == emoji_id
						});
						emoji = filtered_icons[0];
						var emoji_code = emoji[emoji_id];
						var emoji_owner_id = sent_user_id; // relational field
						var emoji_owner_name = session.name;
						
						/*self.update_emoji_archive(message_id, emoji_id, emoji_owner_id, emoji_owner_name);
						// Update emoji list for message
						self.render_emoji_for_message(message_id);*/
					})
				}
			})
		},
		/**
		* Get emoji confied in server to re-update the available emoji
		*/
		getEmojiFromServer: function() {
			var self = this;
			this._rpc({
				model: this.emoji_model,
				method: 'search_read',
				fields: [ 'emoji_name', 'emoji_code', 'id' ],
				domain: []
			}).then(function(result) {
				smiles = {};
				smiles_emoji_id = {};
				var emojis = [];
				for(var i = 0; i < result.length; i++) {
					smiles[result[i].emoji_code] = result[i].emoji_name;
					smiles_emoji_id[result[i].emoji_code] = result[i].id;
					var emoj_id = result[i].id;
					emojis.push({
						'unicode': result[i].emoji_code,
						'id': emoj_id,
						'emoji_name': result[i].emoji_name
					});
				}
				self.emojis = emojis;
				self.smiles_emoji_id = smiles_emoji_id;
			});
		},
		/*
		* After render message thread get emoji for message
		*/
		update_message_emoji_thread: function() {
			var self = this;
			var thread_id = this._currentThreadID;
			// Matching emoji id with emoji icon in array
			self._rpc({
				model: self.emoji_message_model,
				method: 'search_read',
				fields: [ 'emoji_id', 'emoji_owner_id', 'message_id', 'channel_id'],
				domain: [['channel_id', '=', thread_id]]
			}).then(function(emoji_mes_result) {
				var emojis = self.emojis;
				// Reset value for message emoji archive
				self.message_emoji_archive = {};
				// Store message and emoji respectively in message_emoji_archive
				
				for(var i = 0; i < emoji_mes_result.length; i++) {
					var message_id = emoji_mes_result[i].message_id[0]; // relational field
					var emoji_id = emoji_mes_result[i].emoji_id[0]; // relational field
					for(var j = 0; j < emojis.length; j++) {
						var emj = emojis[j]
						var emj_id = emj.id;
						if( emj_id == emoji_id) {
							var emoji_owner_id = emoji_mes_result[i].emoji_owner_id[0]; // relational field
							var emoji_owner_name = emoji_mes_result[i].emoji_owner_id[1];
							self.update_emoji_archive(message_id, emoji_id, emoji_owner_id, emoji_owner_name);
							break;
						}
					}
					
					
				}
				self.render_emoji_for_message();
			})
		},
		/**
		* Render emoji to message
		*/
		render_emoji_for_message: function(update_message_id) {
			var self = this;
			if($('.o_thread_message.o_mail_discussion').length > 0) {
				$('.o_thread_message.o_mail_discussion').each(function(ind, elem) {
					var parent = $(this);
					var message_id = $(elem).attr('data-message-id');
					if(update_message_id == message_id) {
						// Clear all content in message_emojis_wrapper
						$('.message_emojis_wrapper', parent).empty();
					}
					var emojis = self.message_emoji_archive[message_id];
					console.log(message_id, self.message_emoji_archive)
					for (emoji_id in emojis) {
						// if when user drop emoji just update the only that message
						if(update_message_id && update_message_id != message_id ) {
							continue;
						}
						var filtered_icons = self.emojis.filter(function(icon) {
							return icon.id == emoji_id
						});	
						emoji = filtered_icons[0];
						var emoji_tooltip = $('<div />').addClass('emoji-tooltip').attr('message-id', message_id);
						$('.message_emojis_wrapper', parent).append(emoji_tooltip);
						var user_emoji_message = emojis[emoji_id];
						var user_count = emojis[emoji_id].length;
						// get image icon for emoji code
						var emoji_code_wrapper = $("<span/>").addClass("emoticon-wrapper");
						// get emoji code from emoji id
						console.log('self.emojis', self.emojis)
						
						var emoticon=$("<span/>").addClass("emoticon-display").html(emoji.emoji_code).attr("title",emoji.emoji_name).text(emoji.unicode);
						emoji_code_wrapper.append(emoticon);
						
						var user_count_span = $("<span/>").addClass("user-count-wrapper").html(user_count);
						
						var icon_info = $('<div />').addClass('icon-info');
						
						icon_info.append(emoji_code_wrapper);
						if(user_count > 1) {
							icon_info.append(user_count_span);
						}
						
						// Extend tooltip
						var ul = $('<ul />').addClass('emoji-dropped-detail');
						for(var j = 0; j <  user_emoji_message.length; j++) {
							var image_url = user_emoji_message[j].image_url;
							var emoji_owner_name = user_emoji_message[j].emoji_owner_name;
							var user_avatar = '<span class="emoji-drop-avatar"><img src="'+ image_url +'"/></span>';
							var username = '<span class="emoji-drop-name">'+emoji_owner_name+'</span>';
							var li = $('<li />').append(user_avatar).append(username);
							ul.append(li);
						}
						var tooltip_content = $('<div />').addClass('tooltiptext').append(ul);
						emoji_tooltip.append(icon_info);
						emoji_tooltip.append(tooltip_content);
						
					}
					
				});
				
				
			} else {
				self.emoji_message_timeout = setTimeout(function() {
					self.render_emoji_for_message();
				}, 200);
			}
		},
		/**
		* @overwrite
		*/
		start: function() {
			this._super.apply(this, arguments);
		},
		
		/**
		* @overwrite
		*/
		destroy: function() {
			var self = this;
			this._super.apply(this, arguments);
			clearTimeout(self.emoji_message_timeout);
		},
		
		// Render emoji for each message
		update_emoji_archive: function(message_id, emoji_id, emoji_owner_id, emoji_owner_name) {
			var self = this;
			var base_url = session['web.base.url'];
			if(typeof self.message_emoji_archive[message_id] == 'undefined') {
				var user = {emoji_owner_id: emoji_owner_id, emoji_owner_name: emoji_owner_name, image_url: base_url + '/web/image/res.users/'+ emoji_owner_id +'/image_128'};
				self.message_emoji_archive[message_id] = {};
				self.message_emoji_archive[message_id][emoji_id] = [];
				self.message_emoji_archive[message_id][emoji_id][0] = user;
			} else if(typeof self.message_emoji_archive[message_id][emoji_id] == 'undefined') {
				var user = {emoji_owner_id: emoji_owner_id, emoji_owner_name: emoji_owner_name};
				self.message_emoji_archive[message_id][emoji_id] = [];
				self.message_emoji_archive[message_id][emoji_id][0] = user;
			} else {
				var user = {emoji_owner_id: emoji_owner_id, emoji_owner_name: emoji_owner_name};
				var emoji_message_len = self.message_emoji_archive[message_id][emoji_id].length;
				self.message_emoji_archive[message_id][emoji_id][emoji_message_len] = user;
			}
		},
		_onUserDropEmoji: function(message, data) {
			var message_id = data['message_id'];
			var emoji_id = data['emoji_id'];
			var emoji_owner_id = data['partner_id'];
			var emoji_owner_name = data['emoji_owner_name']
			this.update_emoji_archive(message_id, emoji_id, emoji_owner_id, emoji_owner_name);
			this.render_emoji_for_message(message_id);
		}
		
		
	})
});