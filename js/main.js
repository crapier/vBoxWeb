var map;

function initialize() {
    var mapOptions = {
        center: { lat: 30.618989, lng: -96.338653},
        zoom: 16,
        streetViewControl: false,
        panControl: false,
        zoomControl: false
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
}

function draw_path(path, data, colors) {
    var i, j;

    // Check for bad input
    if (path.length < 1 || data.length < 1 || colors.length < 1) {
        console.log("Must have at least 1 location, 1 data point and 1 color.");
        return;
    }
    if (path.length != data.length) {
        console.log("Must have corresponding number of locations and data points.");
        return;
    }

    // Get the minimum and maximum data values
    var min = Math.min.apply(Math, data);
    var max = Math.max.apply(Math, data);

    // Find the points to divide the line by color
    var color_division = [];
    for (i = 0; i < colors.length - 1; i++) {
        color_division[i] = min + (i + 1) * (max - min) / colors.length;
    }
    color_division[color_division.length] = max;

    // Line segments to draw and corresponding color
    var line_segments = [];
    var line_colors = [];

    // Create the line segments based on color division
    var current_segment = [];
    var previous_color = -1;
    for (i = 0; i < path.length; i++) {
        var this_color;
        for (j = 0; j < color_division.length; j++) {
            if (data[i] <= color_division[j]) {
                this_color = j;
                break;
            }
        }
        if (this_color == previous_color) {
            current_segment[current_segment.length] = path[i];
        }
        else {
            if (current_segment.length > 0) {
                line_segments[line_segments.length] = current_segment;
                line_colors[line_colors.length] = previous_color;
            }
            if (i > 0) {
                current_segment = [path[i-1], path[i]];
            }
            else {
                current_segment = [path[i]];
            }
        }
        previous_color = this_color;
    }
    line_segments[line_segments.length] = current_segment;
    line_colors[line_colors.length] = previous_color;

    for (i = 0; i < line_segments.length; i++) {
        var polyline = new google.maps.Polyline({
            path: line_segments[i],
            geodesic: true,
            strokeColor: colors[line_colors[i]],
            strokeOpacity: 1.0,
            strokeWeight: 2
        });

        polyline.setMap(map);
    }
}

function draw_path_test() {
    var path = [
        new google.maps.LatLng(30.614854, -96.337970),
        new google.maps.LatLng(30.614572, -96.338356),
        new google.maps.LatLng(30.614289, -96.338777),
        new google.maps.LatLng(30.614636, -96.339185),
        new google.maps.LatLng(30.614217, -96.339880),
        new google.maps.LatLng(30.613646, -96.339378),
        new google.maps.LatLng(30.613135, -96.338933),
        new google.maps.LatLng(30.612619, -96.338450),
        new google.maps.LatLng(30.612043, -96.337914),
        new google.maps.LatLng(30.611573, -96.337388)
    ];
    var data = [
        0,
        7,
        14,
        21,
        28,
        35,
        42,
        49,
        56,
        63
    ];
    var color = [
        "#FF0000",
        "#FF5E00",
        "#FFC000",
        "#25CA00"
    ];
    draw_path(path, data, color);
}

var log_extension = /.*\.(log)$/;
var log;

function parse_log(log_file_string) {
    console.log(log_file_string);
}

function load_log_input() {
    var log_input = document.getElementById("log_input");

    for (var i = 0; i < log_input.files.length; i++) {
        if (log_extension.test(log_input.files[i].name)) {
            var log_file = log_input.files[i];
            var log_reader = new FileReader;

            log_reader.onload = function (progress_event) {
                parse_log(progress_event.target.result);
            };

            log_reader.readAsText(log_file, 'ANSI');
        }
    }
}

var picture_extension = /.*\.(jpg)$/;
var images = [];

function load_pic_input() {
    var pic_input = document.getElementById("pic_input");

    for (var i = 0; i < pic_input.files.length; i++) {
        if (picture_extension.test(pic_input.files[i].name)) {
            var pic_file = pic_input.files[i];
            var pic_reader = new FileReader;

            pic_reader.onload = function (progress_event) {
                images[images.length] = document.createElement("IMG");
                images[images.length-1].setAttribute("src", progress_event.target.result);
            };

            pic_reader.readAsDataURL(pic_file);
        }
    }
}

initialize();
