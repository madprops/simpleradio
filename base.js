const radio_url = "https://hue.merkoba.com:8765/wok3n"
const metadata_url = "https://hue.merkoba.com:8765/status-json.xsl"
const metadata_interval = 12000
const max_history_length = 1000

var current_title = ""
var current_artist = ""
var history_filtered = false
var modal_open = false

var msg_history

function init()
{
	activate_volume_scroll()
	start_msg()
	start_history_events()
	activate_key_detection()

	get_metadata(true)
	start_metadata_loop()
}

function start_metadata_loop()
{
	setInterval(function()
	{
		get_metadata()
	}, metadata_interval)
}

function get_metadata(first=false)
{
	$.get(metadata_url,
	{

	},
	function(data)
	{
		try
		{
			const source = data.icestats.source

			if(source.artist === undefined || source.title === undefined)
			{
				metadata_error()
				return false
			}

			if(first)
			{
				const tracklist = source.playlist.trackList

				var n = 0

				for(var track of tracklist)
				{
					if(track !== null)
					{
						if(source.artist !== track.creator && source.title !== track.title)
						{
							push_to_history(track.title, track.creator, "Played before radio was loaded")
							
							n += 1
						}

					}

					if(n === 10)
					{
						break
					}
				}
			}

			show_now_playing(source.title, source.artist)
		}

		catch(err)
		{
			metadata_error()
			return false
		}

	}).fail(function(err, status) 
	{
		metadata_error()
		return false
	})	
}

function metadata_error()
{
	show_now_playing("There was an error fetching the metadata")
}

function show_now_playing(title, artist="")
{
	var s = `${title} - ${artist}`

	if(title !== current_title || artist !== current_artist)
	{
		$("#np_title").text(title)
		$("#np_artist").text(artist)

		if(artist === "")
		{
			$("#np_artist").css("padding-top", 0)
		}

		else
		{
			$("#np_artist").css("padding-top", "0.5em")
			push_to_history(title, artist)
		}

		current_title = title
		current_artist = artist
	}
}

function toggle_audio()
{
	if($("#audio_toggle").text() === "Play")
	{
		$("#audio").attr("src", radio_url)
		$("#audio_toggle").text("Stop")
		$("#volume_area").css("display", "inline-block")
	}

	else
	{
		$("#audio").attr("src", "")
		$("#audio_toggle").text("Play")
		$("#volume_area").css("display", "none")
	}
}

function volume_up()
{
	var nv = $("#audio")[0].volume + 0.1

	if(nv > 1)
	{
		nv = 1
	}

	set_volume(nv)
}

function volume_down()
{
	var audio = $('#audio')[0]

	var nv = audio.volume - 0.1

	if(nv < 0)
	{
		nv = 0
	}

	set_volume(nv)
}

function set_volume(nv)
{
	var vt = parseInt(Math.round((nv * 100)))

	$('#audio')[0].volume = nv

	$('#volume_display').text(`Volume: ${vt}%`)
}

function activate_volume_scroll()
{
	document.getElementById('volume_display').addEventListener("wheel", function(e)
	{
		var direction = e.deltaY > 0 ? 'down' : 'up'

		if(direction == 'up')
		{
			var audio = $('#audio')[0]
			var nv = audio.volume + 0.1

			if(nv > 1)
			{
				nv = 1
			}

			set_volume(nv)
		}

		else if(direction == 'down')
		{
			var audio = $('#audio')[0]
			var nv = audio.volume - 0.1

			if(nv < 0)
			{
				nv = 0
			}

			set_volume(nv)
		}
	})
}

function search_song(data=false)
{
	if(data)
	{
		var q = encodeURIComponent(`"${data.title}" by "${data.artist}"`)
	}

	else
	{
		var q = encodeURIComponent(`"${current_title}" by "${current_artist}"`)
	}

	window.open(`https://www.google.com/search?q=${q}`, "_blank")
}

function start_msg()
{
	msg_history = Msg.factory(
	{
		id: "history",
		class: "black",
		clear_editables: true,
		after_create: function(instance)
		{
			after_modal_create(instance)
		},
		after_show: function(instance)
		{
			$("#history_filter").focus()
			after_modal_show(instance)
			after_modal_set_or_show(instance)
		},
		after_set: function(instance)
		{
			after_modal_set_or_show(instance)
		},
		after_close: function(instance)
		{
			reset_history_filter()
			after_modal_close(instance)
		}
	})

	var s = `
	<div>
		<input type="text" id="history_filter" class="filter_input" placeholder="Filter">
		<div class="spacer1"></div>
		<div id="history_container"></div>
	</div>`

	msg_history.set(s)

	$("#history_filter").on("input", function()
	{
		history_filter_timer()
	})
}

function after_modal_create(instance)
{
	start_modal_scrollbar(instance.options.id)
}

function after_modal_show(instance)
{
	modal_open = true
}

function after_modal_set_or_show(instance)
{
	update_modal_scrollbar(instance.options.id)

	setTimeout(function()
	{
		instance.content_container.scrollTop = 0
	}, 100)
}

function after_modal_close(instance)
{
	if(!msg_history.any_open())
	{
		modal_open = false
	}
}

function show_history()
{
	msg_history.show()
}

function push_to_history(title, artist, xtitle=false)
{
	if(xtitle)
	{
		var t = xtitle
	}

	else
	{
		var t = nice_date()
	}

	var s = `
	<div class="history_item_container">
		<span class="history_item pointer" title="${t}">
			<div class="history_item_title">${title}</div>
			<div class="history_item_artist">${artist}</div>
		</span>
	<div>`

	$("#history_container").prepend(s)

	var els = $('#history_container').children()

	if(els.length > max_history_length)
	{
		els.last().remove()		
	}

	if(history_filtered)
	{
		do_history_filter()
	}

	update_modal_scrollbar("history")
}

function nice_date(date=Date.now())
{
	return dateFormat(date, "dddd, mmmm dS, yyyy, h:MM:ss TT")
}

function start_history_events()
{
	$("#history_container").on("click", ".history_item", function() 
	{
		var title = $(this).find(".history_item_title").eq(0).text()
		var artist = $(this).find(".history_item_artist").eq(0).text()
		
		search_song({title:title, artist:artist})
	})
}

var history_filter_timer = (function() 
{
	var timer 

	return function() 
	{
		clearTimeout(timer)

		timer = setTimeout(function() 
		{
			do_history_filter()
		}, 350)
	}
})()

function do_history_filter()
{
	var filter = $("#history_filter").val().trim().toLowerCase()

	if(filter !== "")
	{
		history_filtered = true

		$(".history_item").each(function()
		{
			$(this).parent().css("display", "block")

			var title = $(this).find(".history_item_title").eq(0).text()
			var artist = $(this).find(".history_item_artist").eq(0).text()

			var include = false

			if(title.toLowerCase().indexOf(filter) !== -1)
			{
				include = true
			}

			else if(artist.toLowerCase().indexOf(filter) !== -1)
			{
				include = true
			}

			if(!include)
			{
				$(this).parent().css("display", "none")
			}
		})
	}

	else
	{
		history_filtered = false

		$(".history_item").each(function()
		{
			$(this).parent().css("display", "block")
		})
	}

	update_modal_scrollbar("history")

	$('#Msg-content-container-history').scrollTop(0)
}

function reset_history_filter()
{
	$("#history_filter").val("")
	do_history_filter()
}

function start_modal_scrollbar(s)
{
	$(`#Msg-content-container-${s}`).niceScroll
	({
		zindex: 9999999,
		autohidemode: false,
		cursorcolor: "#AFAFAF",
		cursorborder: "0px solid white",
		cursorwidth: "7px"	
	})
}

function update_modal_scrollbar(s)
{
	$(`#Msg-content-container-${s}`).getNiceScroll().resize()	
}

function activate_key_detection()
{
	$(document).keyup(function(e)
	{
		if(!modal_open)
		{
			if(e.key === " " || e.key === "Enter")
			{
				toggle_audio()
			}

			else if(e.key === "Escape")
			{
				show_history()
			}
		}
	})

	$(document).keydown(function(e)
	{
		if(!modal_open)
		{
			if(e.key === "ArrowUp")
			{
				if($("#audio_toggle").text() === "Stop")
				{
					volume_up()
				}
			}

			else if(e.key === "ArrowDown")
			{
				if($("#audio_toggle").text() === "Stop")
				{
					volume_down()
				}
			}
		}
	})

}