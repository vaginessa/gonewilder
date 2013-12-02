var POST_COLUMNS = 5;
var POSTS_PER_REQUEST = 10;
var USERS_PER_REQUEST = 5;

function init() {
	setupSearch();
	// Setup header buttons
	$('.header .menu div')
		.click(function() {
			tabClickHandler($(this));
		})
		.removeClass('active');
	// Create/click header depending on hash
	var keys = getQueryHashKeys(window.location.hash);
	keys['page'] = keys['page'] || 'users'; // Default to users page
	if (keys['page'] === 'posts' || keys['page'] === 'users') {
		$('.header .menu div#menu_' + keys['page'])
			.addClass('active')
			.click();
	} else {
		userTab(keys['page']);
	}
}

function getQueryHashKeys() {
	var a = window.location.hash.substring(1).split('&');
	if (a == "") return {};
	var b = {};
	for (var i = 0; i < a.length; ++i) {
		var p=a[i].split('=');
		if (p.length != 2) continue;
		b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
	}
	return b;
}

function handleResponse(json) {
	var $table, posts;
	if ( 'user' in json ) {
		handlePosts( $('table#user_' + json.user), json.posts );
	}
	else if ( 'posts' in json ) {
		handlePosts( $('table#posts'), json.posts );
	}
	else if ( 'users' in json ) {
		handleUsers( $('table#users'), json.users );
	}
	scrollHandler();
}

function handlePosts($table, posts) {
	$table.append( $('<tr/>') );
	var index = 0;
	for (var i in posts) {
		var post = posts[i];
		index += addPost($table, index, post);
	}
	$table.data('has_more',   (posts.length == POSTS_PER_REQUEST) );
	$table.data('next_index', $table.data('next_index') + posts.length);
	$table.data('loading',    false);
}

function handleUsers($table, users) {
	$table.append( $('<tr/>') );
	for (var i in users) {
		addUser($table, i, users[i]);
	}
	$table.data('has_more',   (users.length == USERS_PER_REQUEST) );
	$table.data('next_index', $table.data('next_index') + users.length);
	$table.data('loading',    false);
}

function loadMore() {
	var $table = $('table').filter(function() {
		return $(this).css('display') !== 'none';
	});
	if ( $table.data('loading'))  { return; }
	if (!$table.data('has_more')) { return; }
	var url = window.location.pathname + 'api.cgi';
	var params = $table.data('next_params');
	var hash = {
		'page'  : $table.attr('id').replace(/^user_/, ''),
		'sort'  : params['sort'],
		'order' : params['order']
	};
	window.location.hash = $.param(hash);
	params['start'] = $table.data('next_index');
	url += '?' + $.param(params);
	$table.data('loading', true);
	// TODO display loading message
	setTimeout(function() {
		$.getJSON(url)
			.fail(function(data) {
				statusbar('failed to load ' + url + ': ' + String(data));
			})
			.done(handleResponse);
	}, 500);
}

function addUser($table, index, user) {
	var $tr = $('<tr/>')
		.addClass('user')
		.appendTo( $table )
		.click(function() {
			userTab(user.user);
		});
	var $td = $('<td/>')
		.addClass('user')
		.appendTo($tr);
	var $div = $('<div/>').addClass('user');
	$div.append(
			$('<div/>')
				.html(user.user)
				.addClass('username')
		);
	$div.append(
			$('<div/>')
				.html(user.post_n + ' posts')
				.addClass('userinfo')
		);
	$div.append(
			$('<div/>')
				.html(user.image_n + ' images')
				.addClass('userinfo')
		);
	$div.appendTo($td);
	for (var i in user.images) {
		var $imgtd = $('<td/>')
			.addClass('user')
			.appendTo($tr);
		$('<img/>')
			.addClass('post')
			.attr('src', user.images[i].thumb.substr(1))
			.appendTo($imgtd);
	}
}

function addPost($table, index, post) {
	if (post.images.length == 0) {
		console.log("No images for post " + post.id);
		return 0;
	}
	if (index != 0 && index % (POST_COLUMNS) == 0) {
		$('<tr/>').appendTo( $table );
	}
	var $div = $('<td/>')
		.addClass('post')
		.click(function() {
			postClickHandler($(this), post);
		});

	// Thumbnail
	var $img = $('<img/>')
		.addClass('post')
		.attr('src', post.images[0].thumb.substr(1))
		.appendTo($div);

	$div.append( $('<br/>') );
	// Author
	$('<a/>')
		.addClass('author')
		.attr('href', '#user=' + post.author)
		.html(post.author)
		.click(function(e) {
			e.stopPropagation();
			userTab(post.author);
		})
		.appendTo($div);
	$div.append( $('<br/>') );
	// Title
	$('<span/>')
		.addClass('info')
		.html(post.images.length + ' image' + (post.images.length == 1 ? '' : 's') + ' | ')
		.appendTo($div);
	$('<a/>')
		.addClass('info')
		.attr('href', post.permalink)
		.attr('target', '_BLANK' + post.id)
		.click(function(e) {
			e.stopPropagation();
		})
		.html('post')
		.appendTo($div);
	$table.find('tr:last')
		.append($div);
	return 1;
}

function postClickHandler($td, post) {
	// Select
	if ($td.hasClass('selected')) {
		// Selected post was clicked
		$('td.selected').removeClass('selected');
		$('#expandrow').stop().hide(500, function() { $(this).remove() });
		return;
	}
	$('td.selected').removeClass('selected');
	$td.addClass('selected');
	// Expand
	$('#expandrow')
		.stop()
		.removeAttr('id')
		.remove();
	var $etr = $('<tr/>')
		.attr('id', 'expandrow')
		.hide()
		.insertAfter($td.closest('tr'))
		.show(500);
	var $etd = $('<td/>')
		.addClass('expanded')
		.attr('colspan', POST_COLUMNS)
		.remove('img')
		.appendTo($etr);
	var $countdiv = $('<div/>')
		.attr('id', 'expandcount')
		.html('1 of ' + post.images.length)
		.hide()
		.appendTo($etd);
	if (post.images.length > 1) {
		$countdiv.show();
	}
	// Image
	var $img = $('<img/>')
		.addClass('expanded')
		.data('images', post.images)
		.data('index', 0)
		.attr('src', post.images[0].path.substr(1))
		.css({
			'max-width' : ($(document).innerWidth() * 0.95) + 'px',
			'max-height': ($(document).innerHeight() - $td.height() - 100) + 'px'
		})
		.appendTo($etd)
		.click(function() {
			var images = $(this).data('images');
			if (images.length == 0) { return };
			var index = $(this).data('index');
			index += 1;
			if (index >= images.length) index = 0;
			$(this)
				.attr('src', images[index].path.substr(1))
				.data('index', index);
			$('#expandcount').html((index + 1) + ' of ' + images.length);
		});
	// Scroll
	$('html,body')
		.animate({
			'scrollTop': $('#expandrow').prev().offset().top,
		}, 500);
}

function userTab(user) {
	$('#tab_' + user).hide().remove();
	var $div = 
		$('<div/>')
			.html(user)
			.attr('id', 'menu_' + user)
			.click(function() {
				tabClickHandler($(this))
			});
	$('<li/>')
		.attr('id', 'tab_' + user)
		.append($div)
		.appendTo($('#menubar'));
	$div.click();
}

function tabClickHandler($element) {
	// Set up URL and parameters for request
	var url = window.location.pathname + 'api.cgi';
	// Set active tab
	$('.header .menu div').removeClass('active');
	$element.addClass('active');
	// Hide existing table
	$('table').filter(function() {
		return $(this).css('display') !== 'none';
	}).hide().css('display', 'none');

	// Query parameters
	var params = {};
	var keys = getQueryHashKeys();

	var defaultSort = 'ups';
	if ($element.html() === 'users') {
		defaultSort = 'updated';
	}
	params['sort']  = keys['sort']  || defaultSort;
	params['order'] = keys['order'] || 'desc';

	// Get table/params depending on type of content
	var $table;
	if ($element.html() === 'posts') {
		// List of posts from all users
		$table = $('table#posts');
		params['method'] = 'get_posts';
		params['count'] = POSTS_PER_REQUEST;
		addSortRow($table, ['ups', 'created', 'username']);
		if ('page' in keys && keys['page'] !== 'posts') {
			params['sort']  = 'ups';
			params['order'] = 'desc';
		}
	}
	else if ($element.html() === 'users') {
		// List of all users
		$table = $('table#users');
		params['method'] = 'get_users';
		params['count']  = USERS_PER_REQUEST;
		// Insert sort options if needed
		addSortRow($table, ['updated', 'username', 'created']);
		if ('page' in keys && keys['page'] !== 'users') {
			params['sort']  = 'updated';
			params['order'] = 'desc';
		}
	}
	else {
		// List of posts for specific user
		var user = $element.html();
		$table = $('table#user_' + user);
		if ( $table.size() == 0 ) {
			$table = $('<table/>')
				.attr('id', 'user_' + user)
				.addClass('posts')
				.insertAfter( $('table#users') );
			// TODO insert row for user info (download, get URLs, karma, created, updated, etc)
		}
		params['user']   = user;
		params['method'] = 'get_user';
		params['count']  = POSTS_PER_REQUEST;
		addSortRow($table, ['ups', 'created']);
		if ('page' in keys && keys['page'] !== user) {
			console.log('defaulting to UPS');
			params['sort']  = 'ups';
			params['order'] = 'desc';
		}
	}

	$.extend(params, $table.data('next_params'));
	
	// Store query parameters in table
	$table.data('next_params', params);
	$table.data('loading', false);
	$table.data('has_more', true);
	if ( $table.data('next_index') === undefined) {
		$table.data('next_index', 0); // Start at 0
	}
	$table.show(500, function() {
		scrollHandler();
	});

	var hash = {
		'page'  : $element.html(),
		'sort'  : params['sort'],
		'order' : params['order']
	};
	window.location.hash = $.param(hash);
}

function setupSearch() {
	$('input#search')
		.css({
			'width': '60px',
			'opacity' : '0.5'
		})
		.focusin(function() {
			if ($(this).val() === 'search') {
				$(this).val('')
			}
			$(this)
				.stop()
				.animate(
					{
						'width': '125px',
						'opacity': '1',
					}, 
					500);
			$(this).keyup();
		})
		.focusout(function() {
			if ($(this).val() === '') {
				$(this).val('search')
			}
			$(this)
				.stop()
				.animate(
					{
						'width': '60px',
						'opacity': '0.5'
					}, 
					500);
			$('#search_box')
				.slideUp(
					200,
					function() {
						$(this).remove()
					}
				);
		})
		.data('timeout', null)
		.keyup(function(k) {
			if (!$('input#search').is(':focus')) {
				return;
			}
			$('#search_box').hide().remove();
			var $div = $('<div/>')
				.attr('id', 'search_box')
				.addClass('search')
				.hide()
				.css({
					'top'  : $('#menubar').position().top + $('#menubar').height() - 10,
					'left' : $('input#search').position().left + 10
				})
				.append(
					$('<img/>')
						.attr('src', './images/spinner.gif')
						.css({
							'width'  : '25px',
							'height' : '25px'
						})
				)
				.appendTo( $('body') )
				.slideDown(200);
			clearTimeout($(this).data('timeout'));
			var to = setTimeout(function() {
				searchText( $('input#search').val() );
			}, 500);
			$(this).data('timeout', to);
		});
}

function searchText(text) {
	var url = window.location.pathname + 'api.cgi';
	url += '?method=search';
	url += '&search=user:' + text;
	$.getJSON(url)
		.fail(function(data) {
			// TODO failure handling
		})
		.done(function(data) {
			if (!$('input#search').is(':focus')) {
				return;
			}
			if (!'users' in data) {
				return;
			}
			$('#search_box').hide().remove();
			var $div = $('<div/>')
				.attr('id', 'search_box')
				.addClass('search')
				.css({
					'top'  : $('#menubar').position().top + $('#menubar').height() - 10,
					'left' : $('input#search').position().left + 10
				})
				.appendTo( $('body') );

			for (var i in data.users) {
				$('<div/>')
					.addClass('search_result')
					.html(data.users[i].user)
					.click(function(e) {
						e.stopPropagation()
						userTab( $(this).html() );
					})
					.appendTo($div);
			}
			if (data.users.length == 0) {
				$('<div/>')
					.addClass('search_result')
					.click(function() {
						var url = window.location.pathname + 'api.cgi';
						url += '?method=add_user';
						url += '&user=' + text;
						$.getJSON(url)
							.fail(function(data) {
								statusbar('failed to add user, server error');
							})
							.done(function(data) {
								if ('error' in data) {
									statusbar(data.error);
								} else {
									statusbar('undefined error when adding user "' + text + '"');
								}
							});
					})
					.html('+add user "' + text + '"')
					.appendTo($div);
			}
			$div
				.show()
				.slideDown(500);
		});
}

function statusbar(text, timeout) {
	if (timeout === undefined) timeout = 2000;
	$('div#statusbar')
		.stop()
		.hide()
		.html(text)
		.slideDown(500,
			function() {
				setTimeout( function() {
					$('div#statusbar').slideUp(500);
				}, timeout);
			});
}

function addPostSortRow($table) {
	$table.find('tr.sort').remove();
	var $tr = $('<tr/>').addClass('sort');
	var $td = $('<td/>')
		.attr('colspan', POST_COLUMNS)
		.addClass('sort')
		.appendTo($tr)
		.append( $('<span/>').html('sort by:') );
	$td.append(createSortButton($table, 'sort', 'ups'));
	$td.append(createSortButton($table, 'sort', 'created'));
	$td.append(createSortButton($table, 'sort', 'username'));
	$td.append( $('<span/>').html('order by:').css('padding-left', '10px') );
	$td.append(createSortButton($table, 'order', 'asc'));
	$td.append(createSortButton($table, 'order', 'desc'));
	$table.append($tr);
}
function addSortRow($table, sorts) {
	if ( $table.find('tr.sort').size() > 0 ) {
		return;
	}
	$table.find('tr.sort').remove();
	var $tr = $('<tr/>').addClass('sort');
	var $td = $('<td/>')
		.attr('colspan', POST_COLUMNS)
		.addClass('sort')
		.appendTo($tr)
		.append( $('<span/>').html('sort by:') );
	for (var i in sorts) { // username, created, updated
		$td.append(createSortButton($table, 'sort', sorts[i]));
	}
	$td.append( $('<span/>').html('order by:').css('padding-left', '10px') );
	$td.append(createSortButton($table, 'order', 'asc'));
	$td.append(createSortButton($table, 'order', 'desc'));
	$table.append($tr);
}

function createSortButton($table, type, label) {
	return $('<span/>')
		.addClass('sort')
		.html(label)
		.click(function() {
			// Set params
			$table.data('next_params')[type] = label;
			$table.data('next_index', 0);
			// Remove existing content
			$table.find('tr:not(.sort)').remove();
			// Refresh with new params
			scrollHandler();
		});
}

function clearTable($table) {
}

function scrollHandler() {
	var page     = $(document).height(); // Height of document
	var viewport = $(window).height();   // Height of viewing window
	var scroll   = $(document).scrollTop() || window.pageYOffset; // Scroll position (top)
	var remain = page - (viewport + scroll);
	if (viewport > page || // Viewport is bigger than entire page
	    remain < 300) {    // User has scrolled down far enough
		loadMore();
	}
}

$(document).ready(init);
$(window).scroll(scrollHandler);
