// The google map object
var map;
// Current polylines drawn
var polylines = [];

// Regular expression for log files
var log_extension = /.*\.(log)$/;
// Array of Log_File_Info
var logs = [];

// Regular expression for
var picture_extension = /.*\.(jpg)$/;
// Array of Pic_File_Info
var images = [];

var menu_buttons = [];
var menu_contents = [];

// Structure for Log file information
function Log_File_Info() {
    this.log_data = "";
    this.filename = "";
    this.parsed_data = [];
}

// Structure for Picture file information
function Pic_File_Info() {
    this.img = document.createElement("IMG");
    this.filename = "";
}

// Set options and initialize Google Maps
function initialize() {
    // Map options for the Embedded Google Map
    var mapOptions = {
        center: { lat: 30.618989, lng: -96.338653},
        zoom: 16,
        streetViewControl: false,
        panControl: false,
        zoomControl: false
    };
    // Create the map
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    menu_buttons[menu_buttons.length] = document.getElementById("log_load_button");
    menu_buttons[menu_buttons.length] = document.getElementById("picture_load_button");
    menu_buttons[menu_buttons.length] = document.getElementById("log_select_button");
    menu_buttons[menu_buttons.length] = document.getElementById("data_select_button");

    menu_contents[menu_contents.length] = document.getElementById("log_load_content");
    menu_contents[menu_contents.length] = document.getElementById("picture_load_content");
    menu_contents[menu_contents.length] = document.getElementById("log_select_content");
    menu_contents[menu_contents.length] = document.getElementById("data_select_content");

    for (var i = 0; i < menu_buttons.length; i++) {
        menu_buttons[i].onclick = function (e) {
            for (var i = 0; i < menu_contents.length; i++) {
                menu_contents[i].style.display = "none";
            }
            e.target.nextElementSibling.style.display = "block"
        }
    }

    // Add listener for resizing window
    window.addEventListener("resize", handle_resize);
}

// Draw a colored path
//  path - array of LatLng locations
//  data - array of data corresponding to path points
//  colors - array of strings in format "#RRGGBB" to color path
//  quantity - the quantity that is being drawn (string)
//  unit - the unit for the quantity (string)
function draw_path(path, data, colors, quantity, unit) {
    // variables for loop control
    var i, j;

    // Remove all current polylines from the map
    for (i = 0; i < polylines.length; i++) {
        polylines[i].setMap(null);
    }
    polylines = [];

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

    // Add legend to legend div and un-hide it
    var legend = document.getElementById("legend");
    legend.innerHTML = quantity + "<br>";
    legend.style.display = "block";
    for (i = 0; i < color_division.length; i++) {
        var legend_box = document.createElement("div");
        legend_box.className = "legend-box";
        legend_box.style.backgroundColor = colors[i];
        legend.appendChild(legend_box);
        if (i == 0) {
            legend.innerHTML = legend.innerHTML + " " + min + " - " + color_division[i] + " " + unit + "<br>";
        }
        else {
            legend.innerHTML = legend.innerHTML + " " + color_division[i-1] + 1 + " - " + color_division[i] + " " + unit + "<br>";
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

    // Create and draw the individual polylines
    for (i = 0; i < line_segments.length; i++) {
        polylines[polylines.length] = new google.maps.Polyline({
            path: line_segments[i],
            geodesic: true,
            strokeColor: colors[line_colors[i]],
            strokeOpacity: 1.0,
            strokeWeight: 5
        });

        polylines[polylines.length - 1].setMap(map);
    }

    // Find the southwest and northeast region for the path
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

    // Zoom and move to the region
    var sw = new google.maps.LatLng(south, west);
    var ne = new google.maps.LatLng(north, east);
    var bounds = new google.maps.LatLngBounds(sw, ne);
    map.fitBounds(bounds);
}

// Draw data from a log file
//  log_file_info - log file to use
//  data_selection - which data/quantity to use
function draw_data(log_file_info, data_selection) {
    var path = [];
    var data = [];
    var color = [
        "#FF0000",
        "#FF5E00",
        "#FFC000",
        "#25CA00"
    ];

    // Create LatLng objects
    for(var i = 1; i < log_file_info.parsed_data.length; i++) {
        path[i-1] = new google.maps.LatLng(parseFloat(log_file_info.parsed_data[i][1]), parseFloat(log_file_info.parsed_data[i][2]));
        data[i-1] = parseFloat(log_file_info.parsed_data[i][data_selection]);
    }

    var quantity_unit = log_file_info.parsed_data[0][data_selection].split("-");
    draw_path(path, data, color, quantity_unit[0], quantity_unit[1]);
}

// Handle button presses for selecting which data/quantity to use
function select_data(){
    var log_select = document.getElementById("log_select_dropdown");
    var data_select = document.getElementById("data_select_dropdown");
    if (data_select.length > 0 && data_select.value != "No Data Loaded") {
        draw_data(logs[log_select.selectedIndex], data_select.selectedIndex + 3);
    }
}

// Handle button presses for selecting which loaded log to use
function select_log() {
    var log_select = document.getElementById("log_select_dropdown");
    if (log_select.length > 0 && log_select.value != "No Logs Loaded") {
        parse_log(logs[log_select.selectedIndex]);

        var data_select_dropdown = document.getElementById("data_select_dropdown");
        while (data_select_dropdown.length > 0) {
            data_select_dropdown.remove(0);
        }
        for (var i = 3; i < logs[log_select.selectedIndex].parsed_data[0].length; i++) {
            var option = document.createElement("option");
            option.text = logs[log_select.selectedIndex].parsed_data[0][i].split("-")[0];
            data_select_dropdown.add(option);
        }

        menu_buttons[3].click();
    }
}

// Parse a log file
//  log_file_info - log file structure to parse the data for
function parse_log(log_file_info) {
    // Parse by line
    log_file_info.parsed_data = log_file_info.log_data.split("\n");
    // Parse each line by spaces
    for (var i = 0; i < log_file_info.parsed_data.length; i++) {
        log_file_info.parsed_data[i] = log_file_info.parsed_data[i].split(" ");
    }
}

// Handle loading logs when Load Logs button is pressed
//  Only read name.log files
function load_log_input() {
    // loop control
    var i;
    // Clear current logs
    logs = [];

    // Get the file input element for logs
    var log_input = document.getElementById("log_input");

    // Clear the logs in the log select dropdown
    var log_select = document.getElementById("log_select_dropdown");
    while (log_select.length > 0) {
        log_select.remove(0);
    }

    // Test each selected file to see if its a log and if it is create a
    //  log info structure for it after reading it in
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

    // Select Log Select Detail
    menu_buttons[2].click();
}

// Handle loading images when Load Pictures is pressed
//  Only reads name.jpg files
function load_pic_input() {
    // Clear images
    images = [];

    // Get the file input for pictures
    var pic_input = document.getElementById("pic_input");

    // Test each selected file to see if it is an image and create
    // a pic image info structure for it after reading it in
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

function show_graphs() {
    var log_select = document.getElementById("log_select_dropdown");
    if (log_select.length > 0 && log_select.value != "No Logs Loaded") {
        var graph_div = document.getElementById("graph-popup");
        graph_div.style.display = "block";

        graph_div.style.height = window.innerHeight - 100 + "px";
        graph_div.style.width = window.innerWidth - 100 + "px";

        parse_log(logs[log_select.selectedIndex]);
        var parsed_data = logs[log_select.selectedIndex].parsed_data;

        graph_div.innerHTML = '<button id="graph-close-button" onclick="close_graphs()">Close</button>';
        var i;
        for (i = 3; i < parsed_data[0].length; i++) {
            graph_div.innerHTML = graph_div.innerHTML + '<canvas id="chart-' + (i - 2) + '" width="600" height="600"> </canvas>';
        }

        var timestamps = [];
        var increment = Math.floor(parsed_data.length/10);
        for(i = 1; i < parsed_data.length; i++) {
            if ((i-1) % increment == 0) {
                timestamps[i-1] = parsed_data[i][0];
            }
            else {
                timestamps[i-1] = "";
            }
        }

        for (i = 3; i < parsed_data[0].length; i++) {
            var data = [];
            for(var j = 1; j < parsed_data.length; j++) {
                data[j-1] = parseFloat(parsed_data[j][i]);
            }

            // Create and draw the chart
            var ctx = document.getElementById("chart-" + (i-2)).getContext("2d");
            var chart_data = {
                labels: timestamps,
                datasets: [
                    {
                        label: "My First dataset",
                        fillColor: "rgba(220,220,220,0.2)",
                        strokeColor: "rgba(220,220,220,1)",
                        pointColor: "rgba(220,220,220,1)",
                        pointStrokeColor: "#fff",
                        pointHighlightFill: "#fff",
                        pointHighlightStroke: "rgba(220,220,220,1)",
                        data: data
                    }
                ]
            };
            var options = {
                bezierCurve: false,
                datasetFill: false
            };
            var chart = new Chart(ctx).Line(chart_data, options);
        }
    }
}

function close_graphs() {
    var graph_div = document.getElementById("graph-popup");
    graph_div.style.display = "none";
}

function handle_resize(event) {
    var graph_div = document.getElementById("graph-popup");
    if (graph_div.style.display == "block") {
        graph_div.style.height = window.innerHeight - 100 + "px";
        graph_div.style.width = window.innerWidth - 100 + "px";
    }
}

// Begin the App
initialize();
