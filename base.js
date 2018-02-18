const radio_url = "https://hue.merkoba.com:8765/wok3n"
const metadata_url = "https://hue.merkoba.com:8765/status-json.xsl"
const metadata_interval = 12000
var current_title = ""
var current_artist = ""

function init()
{
	activate_volume_scroll()
	get_metadata()
	start_metadata_loop()
}

function start_metadata_loop()
{
	setInterval(function()
	{
		get_metadata()
	}, metadata_interval)
}

function get_metadata()
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

	if(title !== current_title && artist !== current_artist)
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
		}

		current_title = title
		current_artist = artist
	}
}

function toggle_audio()
{
	if($("#audio")[0].paused)
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

function search_song()
{
	var q = encodeURIComponent(`"${current_title}" by "${current_artist}"`)
	window.open(`https://www.google.com/search?q=${q}`, "_blank")
}