odoo.define('discuss_emoji.thread_message', function(require) {
	var DocumentViewer = require('mail.DocumentViewer');
	var mailUtils = require('mail.utils');
	
	var core = require('web.core');
	var time = require('web.time');
	var Widget = require('web.Widget');
	var session = require('web.session');
	
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
			'click .show_discuss_emoji': '_onClickDiscussEmojiIcon'
	    },
		emoji_message_model: 'discuss.emoji_message',
		emoji_model: 'discuss.emoji',
		// emoji for message archive
		message_emoji_archive: {},
		// Users dropped emoji
		user_dropped_emoji: [],
		
		// emoji list
		emoji: [],
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
	
	        this._renderMessageMailPopover(messages);
	        if (thread.hasSeenFeature()) {
	            this._renderMessageSeenPopover(thread, messages);
	        }
			this.getEmojiFromServer();
			this.update_message_emoji_thread();
			
	    },
		_onClickDiscussEmojiIcon: function(ev) {
			var mb_smile_wrapper = $(ev.target).next();
			var emoji_left_pos = $(ev.target).position().left;

			window.emoji_left_pos = emoji_left_pos;
			$('.mbSmilesButton', mb_smile_wrapper).trigger('click');
		},
		addEmojiIcon: function() {
			var self = this;
			if($('.ta').length > 0) {
				$('.ta').each(function(ind, elem) {
					$(elem).mbSmilesBox();
					// Attach click event to icon
					var ta_wrapper = $(elem).parents('.mbSmilesWrapper');
					$('.mbSmilesBox', ta_wrapper).find('.emoticon').each(function() {
						$(this).click(function(e) {
							var icon = $(e.target);
							icon_id = icon.parent().attr('emoji-id');
							icon_id = parseInt(icon_id);
							// Get parent paragraph message id
							var parent_paragraph_message = icon.parents('.o_thread_message.o_mail_discussion');
							var patent_paragraph_message_id = parent_paragraph_message.attr('data-message-id');
							patent_paragraph_message_id  = parseInt(patent_paragraph_message_id);
							
							// Get user drop emoji
							var user_id = session.uid;
							self.sendEmojiToServer(user_id, icon_id, patent_paragraph_message_id)
						})
					})
				});
			} else {
				setTimeout(function() {
					self.addEmojiIcon();
				}, 200);
			}
		},
		/**
		* This is when user drop emoji
		/*/
		sendEmojiToServer: function(sent_user_id, emoji_id, message_id) {
			var self = this;
			// Check if user drop emoji for message
			var vals = {
				name: emoji_id + '-' +message_id + '-' + sent_user_id,
				emoji_id: emoji_id,
				message_id: message_id,
				emoji_owner_id: sent_user_id
			}
			this._rpc({
                model: self.emoji_message_model,
                method: 'search_read',
                fields: [ 'emoji_id', 'message_id', 'emoji_owner_id'],
				domain: [['emoji_owner_id', '=', sent_user_id], ['message_id', '=', message_id], ['emoji_id', '=', emoji_id]]
            }).then(function(result) {
				if(result.length > 0) {
					var vals = {
						name: emoji_id + '-' +message_id + '-' + sent_user_id,
						emoji_id: emoji_id,
						message_id: message_id,
						emoji_owner_id: sent_user_id
					}
					this._rpc({
		                model: self.emoji_message_model,
		                method: 'create',
		                args: [vals],
		            }).then(function() {
						// Update value for message emoji archive
						var emoji = self.emoji;
						var message_id = message_id; // relational field
						var emoji_id = emoji_id; // relational field
						var emoji_icon = emoji[emoji_id];
						var emoji_owner_id = sent_user_id; // relational field
						var emoji_owner_name = session.name;
						self.user_dropped_emoji[self.user_dropped_emoji.length] = emoji_owner_id;
						
						if(typeof self.message_emoji_archive[message_id] == 'undefined') {
							var user = {emoji_owner_id: emoji_owner_id, emoji_owner_name: emoji_owner_name, image_url: base_url + '/web/image/res.users/'+ emoji_owner_id +'/image_128'};
							self.message_emoji_archive[message_id] = {};
							self.message_emoji_archive[message_id][emoji_icon] = [];
							self.message_emoji_archive[message_id][emoji_icon][0] = user;
						} else if(typeof self.message_emoji_archive[message_id][emoji_icon] == 'undefined') {
							var user = {emoji_owner_id: emoji_owner_id, emoji_owner_name: emoji_owner_name};
							self.message_emoji_archive[message_id][emoji_icon] = [];
							self.message_emoji_archive[message_id][emoji_icon][0] = user;
						} else {
							var user = {emoji_owner_id: emoji_owner_id, emoji_owner_name: emoji_owner_name};
							var emoji_message_len = self.message_emoji_archive[message_id][emoji_icon].length;
							self.message_emoji_archive[message_id][emoji_icon][emoji_message_len] = user;
						}
						// Update emoji list for message
						self.render_emoji_for_message(message_id);
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
				fields: [ 'emoji_name', 'emoji_code' ],
				domain: []
			}).then(function(result) {
				smiles = {};
				smiles_emoji_id = {}
				for(var i = 0; i < result.length; i++) {
					smiles[result[i].emoji_code] = result[i].emoji_name;
					smiles_emoji_id[result[i].emoji_code] = result[i].id;
				}
				self.smiles_emoji_id = smiles_emoji_id;
				$.mbEmoticons.smiles = smiles;
				$.mbEmoticons.smiles_emoji_id = smiles_emoji_id;
				// After get emoji from server, show it for user
				self.addEmojiIcon();
			});
		},
		/*
		* After render message thread get emoji for message
		*/
		update_message_emoji_thread: function() {
			var self = this;
			/*
			* Get emoji for each message and store it in message_emoji_archive
			*/
			this._rpc({
				model: self.emoji_model,
				method: 'search_read',
				fields: [ 'id' ,'emoji_name', 'emoji_code' ],
				domain: []
			}).then(function(emoji_res) {
				// Matching emoji id with emoji icon in array
				var emoji = [];
				for(var x  = 0; x < emoji_res.length; x++) {
					var emoj_id = emoji_res[x].id;
					emoji[emoj_id] = emoji_res[x].emoji_code;
				}
				self.emoji = emoji;
				self._rpc({
					model: self.emoji_message_model,
					method: 'search_read',
					fields: [ 'emoji_id', 'emoji_owner_id', 'message_id'],
					domain: []
				}).then(function(emoji_mes_result) {
					// Reset value for message emoji archive
					self.message_emoji_archive = {};
					var base_url = session['web.base.url'];
					// Store message and emoji respectively in message_emoji_archive
					for(var i = 0; i < emoji_mes_result.length; i++) {
						var message_id = emoji_mes_result[i].message_id[0]; // relational field
						var emoji_id = emoji_mes_result[i].emoji_id[0]; // relational field
						var emoji_icon = emoji[emoji_id];
						var emoji_owner_id = emoji_mes_result[i].emoji_owner_id[0]; // relational field
						var emoji_owner_name = emoji_mes_result[i].emoji_owner_id[1];
						self.user_dropped_emoji[self.user_dropped_emoji.length] = emoji_owner_id;
						if(typeof self.message_emoji_archive[message_id] == 'undefined') {
							var user = {emoji_owner_id: emoji_owner_id, emoji_owner_name: emoji_owner_name, image_url: base_url + '/web/image/res.users/'+ emoji_owner_id +'/image_128'};
							self.message_emoji_archive[message_id] = {};
							self.message_emoji_archive[message_id][emoji_icon] = [];
							self.message_emoji_archive[message_id][emoji_icon][0] = user;
						} else if(typeof self.message_emoji_archive[message_id][emoji_icon] == 'undefined') {
							var user = {emoji_owner_id: emoji_owner_id, emoji_owner_name: emoji_owner_name};
							self.message_emoji_archive[message_id][emoji_icon] = [];
							self.message_emoji_archive[message_id][emoji_icon][0] = user;
						} else {
							var user = {emoji_owner_id: emoji_owner_id, emoji_owner_name: emoji_owner_name};
							var emoji_message_len = self.message_emoji_archive[message_id][emoji_icon].length;
							self.message_emoji_archive[message_id][emoji_icon][emoji_message_len] = user;
						}
					}
					self.render_emoji_for_message();
				})
			});
			
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
					for (emoji_code in emojis) {
						// if when user drop emoji just update the only that message
						console.log('update_message_id', update_message_id);
						if(update_message_id && update_message_id != message_id ) {
							continue;
						}
						var emoji_tooltip = $('<div />').addClass('emoji-tooltip').attr('message-id', message_id).attr('emoji-code', emoji_code);
						$('.message_emojis_wrapper', parent).append(emoji_tooltip);
						var user_emoji_message = emojis[emoji_code];
						var user_count = emojis[emoji_code].length;
						// get image icon for emoji code
						var emoji_code_wrapper = $("<span/>").addClass("emoticon-wrapper");
						var emoticon=$("<span/>").addClass("emoticon-display").html(emoji_code).attr("title",emoji_code);
						emoji_code_wrapper.append(emoticon);
						emoticon.emoticonize().data("emoticon-display",emoji_code);
						
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
				setTimeout(function() {
					self.render_emoji_for_message();
				}, 200);
			}
		},
		/*
		* Tooltip to show detail users who drop emoji
		*/
		
		
	})
});