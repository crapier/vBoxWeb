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

function draw_path(path, data, colors, unit) {
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

    var legend = document.getElementById("legend");
    legend.innerHTML = "";
    for (i = 0; i < color_division.length; i++) {
        if (i == 0) {
            legend.innerHTML = legend.innerHTML + min + " - " + color_division[i] + " " + unit + "<br>";
        }
        else {
            legend.innerHTML = legend.innerHTML + color_division[i-1] + 1 + " - " + color_division[i] + " " + unit + "<br>";
        }
    }

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
            strokeWeight: 5
        });

        polyline.setMap(map);
    }

    var south = 200;
    var north = -200;
    var west = 200;
    var east = -200;

    for (i = 0; i < path.length; i++) {
        if (path[i].lat() < south) {
            south = path[i].lat();
        }
        if (path[i].lat() > north) {
            north = path[i].lat();
        }
        if (path[i].lng() < west) {
            west = path[i].lng();
        }
        if (path[i].lng() > east) {
            east = path[i].lng();
        }
    }

    var sw = new google.maps.LatLng(south, west);
    var ne = new google.maps.LatLng(north, east);
    var bounds = new google.maps.LatLngBounds(sw, ne);
    map.fitBounds(bounds);
}

function draw_data(log_file_info, data_selection) {
    var path = [];
    var data = [];
    var color = [
        "#FF0000",
        "#FF5E00",
        "#FFC000",
        "#25CA00"
    ];

    for(var i = 1; i < log_file_info.parsed_data.length; i++) {
        path[i-1] = new google.maps.LatLng(parseFloat(log_file_info.parsed_data[i][0]), parseFloat(log_file_info.parsed_data[i][1]));
        data[i-1] = parseFloat(log_file_info.parsed_data[i][data_selection]);
    }

    draw_path(path, data, color, log_file_info.parsed_data[0][data_selection].split("-")[1]);
}

function select_data(){
    var log_select = document.getElementById("log_select_dropdown");
    var data_select = document.getElementById("data_select_dropdown");
    if (data_select.length > 0 && data_select.value != "No Data Loaded") {
        draw_data(logs[log_select.selectedIndex], data_select.selectedIndex + 2);
    }
}

var log_extension = /.*\.(log)$/;
var logs = [];

function Log_File_Info() {
    this.log_data = "";
    this.filename = "";
    this.parsed_data = [];
}

function select_log() {
    var log_select = document.getElementById("log_select_dropdown");
    if (log_select.length > 0 && log_select.value != "No Logs Loaded") {
        parse_log(logs[log_select.selectedIndex]);

        var data_select_dropdown = document.getElementById("data_select_dropdown");
        while (data_select_dropdown.length > 0) {
            data_select_dropdown.remove(0);
        }
        for (var i = 2; i < logs[log_select.selectedIndex].parsed_data[0].length; i++) {
            var option = document.createElement("option");
            option.text = logs[log_select.selectedIndex].parsed_data[0][i].split("-")[0];
            data_select_dropdown.add(option);
        }

        var log_data_details = document.getElementById("data_details");
        log_data_details.open = true;
        var log_select_details = document.getElementById("log_select_details");
        log_select_details.open = false;
    }
}

function parse_log(log_file_info) {
    log_file_info.parsed_data = log_file_info.log_data.split("\n");
    for (var i = 0; i < log_file_info.parsed_data.length; i++) {
        log_file_info.parsed_data[i] = log_file_info.parsed_data[i].split(" ");
    }
}

function load_log_input() {
    var i;
    logs = [];

    var log_input = document.getElementById("log_input");

    var log_select = document.getElementById("log_select_dropdown");
    while (log_select.length > 0) {
        log_select.remove(0);
    }

    for (i = 0; i < log_input.files.length; i++) {
        if (log_extension.test(log_input.files[i].name)) {
            var log_file = log_input.files[i];
            var log_reader = new FileReader;
            log_reader.filename = log_file.name;

            log_reader.onload = function (progress_event) {
                logs[logs.length] = new Log_File_Info();
                logs[logs.length - 1].log_data = progress_event.target.result;
                logs[logs.length - 1].filename = progress_event.target.filename;

                var log_option = document.createElement("option");
                log_option.text = logs[logs.length - 1].filename;
                log_select.add(log_option);
            };

            log_reader.readAsText(log_file, 'ANSI');
        }
    }

    var log_select_details = document.getElementById("log_select_details");
    log_select_details.open = true;

    var log_load_details = document.getElementById("log_load_details");
    log_load_details.open = false;
}

var picture_extension = /.*\.(jpg)$/;
var images = [];

function Pic_File_Info() {
    this.img = document.createElement("IMG");
    this.filename = "";
}

function load_pic_input() {
    images = [];

    var pic_input = document.getElementById("pic_input");

    for (var i = 0; i < pic_input.files.length; i++) {
        if (picture_extension.test(pic_input.files[i].name)) {
            var pic_file = pic_input.files[i];
            var pic_reader = new FileReader;
            pic_reader.filename = pic_file.name;

            pic_reader.onload = function (progress_event) {
                images[images.length] = new Pic_File_Info();
                images[images.length-1].img.setAttribute("src", progress_event.target.result);
                images[images.length-1].filename = progress_event.target.filename;
            };

            pic_reader.readAsDataURL(pic_file);
        }
    }
}

initialize();
