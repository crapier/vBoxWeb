// The google map object
var map;
// Current polylines drawn
var polylines = [];
// Start and end Marker
var start_marker;
var end_marker;

// Regular expression for log files
var log_extension = /.*\.(log)$/;
// Array of Log_File_Info
var logs = [];

// Array of Charts
var charts = [];

// Regular expression for
var picture_extension = /.*\.(jpg)$/;
// Array of Pic_File_Info
var images = [];

// Menu Button and Content Divs
var menu_buttons = [];
var menu_contents = [];

// Toggle sidebar bool
var sidebar_visible = true;

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

var click_info = new google.maps.InfoWindow({
    content: "Empty",
    maxWidth: 1000
});

function polyline_click (event) {
    var latlng = event.latLng;
    var minDistance = 999999999999;
    var index = -1;

    var log_select = document.getElementById("log_select_dropdown");
    var parsed_data = logs[log_select.selectedIndex].parsed_data;

    for (var i = 1; i < parsed_data.length; i++) {
        var dist = Math.sqrt(Math.pow((latlng.lat() - parsed_data[i][1]), 2) + Math.pow((latlng.lng() - parsed_data[i][2]), 2));
        if (dist < minDistance) {
            index = i;
            minDistance = dist;
        }
    }

    if (index != -1) {
        click_info.setPosition(new google.maps.LatLng(parsed_data[index][1], parsed_data[index][2]));

        var table = document.createElement("table");
        table.setAttribute("class", "infotable");
        table.insertRow(0).insertCell(0).innerHTML = parse_timestamp(parsed_data[index][0]);
        for (i = 3; i < parsed_data[0].length; i++) {
            table.insertRow(i-2).insertCell(0).innerHTML = parsed_data[0][i].split('-')[0] + ": " + parsed_data[index][i] + " " + parsed_data[0][i].split('-')[1];
        }

        var timestamp = parseInt(parsed_data[index][0]);
        var time_diff = 1000000;
        var img_index = -1;
        for (i = 0; i < images.length; i++) {
            var diff = Math.abs(timestamp - parseInt(images[i].filename.substr(0, images[i].filename.length - 4)));
            if (diff < time_diff) {
                img_index = i;
                time_diff = diff;
            }
        }

        var div = document.createElement("div");
        div.setAttribute("class", "infobox");
        div.appendChild(table);

        if (img_index != -1) {
            div.appendChild(images[img_index].img);
        }

        click_info.open(map);
        click_info.setContent(div);
    }
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
            legend.innerHTML = legend.innerHTML + " " + Math.round(min) + " - " + Math.round(color_division[i]) + " " + unit + "<br>";
        }
        else {
            legend.innerHTML = legend.innerHTML + " " + Math.round(color_division[i-1] + 1) + " - " + Math.round(color_division[i]) + " " + unit + "<br>";
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

    // Remove start and end marker if present
    if (start_marker) {
        start_marker.setMap(null);
        end_marker.setMap(null);
    }

    // Create and Draw the Start and End position Markers
    start_marker = new google.maps.Marker({
        position: path[0],
        map: map,
        icon: {
            url: "img/startPosition.png",
            anchor: new google.maps.Point(20, 20)
        },
        title: "Start",
        cursor: "Start",
        clickable: false,
        zIndex: 40
    });
    end_marker = new google.maps.Marker({
        position: path[path.length-1],
        map: map,
        icon: {
            url: "img/endPosition.png",
            anchor: new google.maps.Point(20, 20)
        },
        title: "End",
        cursor: "End",
        clickable: false,
        zIndex: 50
    });

    // Create and draw the individual polylines
    for (i = 0; i < line_segments.length; i++) {
        polylines[polylines.length] = new google.maps.Polyline({
            path: line_segments[i],
            geodesic: true,
            strokeColor: colors[line_colors[i]],
            strokeOpacity: 1.0,
            strokeWeight: 5,
            zIndex: 100
        });

        polylines[polylines.length - 1].setMap(map);
        google.maps.event.addListener(polylines[polylines.length-1], 'click', polyline_click);
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

        // Hide the legend if it was shown
        var legend = document.getElementById("legend");
        legend.style.display = "none";

        // Remove all current polylines from the map
        for (i = 0; i < polylines.length; i++) {
            polylines[i].setMap(null);
        }
        polylines = [];

        // Remove start and end marker if present
        if (start_marker) {
            start_marker.setMap(null);
            end_marker.setMap(null);
        }

        // Close infowindow
        click_info.setMap(null);

        menu_buttons[3].click();

        select_data();
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
    // Get the file input element for logs
    var log_input = document.getElementById("log_input");
    // Check that files are actually selected
    if (log_input.files.length > 0) {
        // Check that there is at least 1 log to actually load
        var valid_logs = false;
        for (i = 0; i < log_input.files.length; i++) {
            if (log_extension.test(log_input.files[i].name)) {
                valid_logs = true;
                break;
            }
        }

        // There are logs to load
        if (valid_logs) {
            // loop control
            var i;
            // Clear current logs
            logs = [];

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

            // Select Load Pictures
            menu_buttons[1].click();
        }
    }
}

// Handle loading images when Load Pictures is pressed
//  Only reads name.jpg files
function load_pic_input() {
    // Get the file input for pictures
    var pic_input = document.getElementById("pic_input");

    // Check that files are actually selected
    if (pic_input.files.length > 0) {
        // Check that there is at least 1 picture to actually load
        var valid_pic = false;
        for (i = 0; i < pic_input.files.length; i++) {
            if (picture_extension.test(pic_input.files[i].name)) {
                valid_pic = true;
                break;
            }
        }

        // There are pics to load
        if (valid_pic) {
            // Clear images
            images = [];

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

            // Select Log Select Detail
            menu_buttons[2].click();
        }
    }
}

function parse_timestamp(stamp) {
    var year = stamp.substr(0, 4);
    var month = stamp.substr(4, 2);
    var day = stamp.substr(6, 2);
    var hour = stamp.substr(8, 2);
    var minute = stamp.substr(10, 2);
    var second = stamp.substr(12, 2);
    var milisecond = stamp.substr(14, 3);

    return hour + ":" + minute + ":" + second + ":" + milisecond + " " + month + "/" + day + "/" + year;
}

function parse_timestamp_no_ms(stamp) {
    var year = stamp.substr(0, 4);
    var month = stamp.substr(4, 2);
    var day = stamp.substr(6, 2);
    var hour = stamp.substr(8, 2);
    var minute = stamp.substr(10, 2);
    var second = stamp.substr(12, 2);

    return hour + ":" + minute + ":" + second + " " + month + "/" + day + "/" + year;
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
        var table = document.createElement("TABLE");
        graph_div.appendChild(table);
        var i;

        var graph_row = table.insertRow(0);
        for (i = 3; i < parsed_data[0].length; i++) {
            var cell_graph = graph_row.insertCell(i-3);
            cell_graph.innerHTML = '<div id="chart-' + (i - 2) + '"> </canvas>';
        }

        var timestamps = "";
        for (i = 1; i < parsed_data.length-1; i++) {
            timestamps += parse_timestamp_no_ms(parsed_data[i][0]) + "|";
        }
        timestamps += parsed_data[parsed_data.length-1][0];

        charts = [];
        for (i = 3; i < parsed_data[0].length; i++) {
            var data = "";
            for (var j = 1; j < parsed_data.length-1; j++) {
                data += parsed_data[j][i] + "|";
            }
            data += parsed_data[parsed_data.length-1][i];

            charts[charts.length] = new FusionCharts({
                "type": "zoomline",
                "renderAt": "chart-" + (i-2),
                "width": "800",
                "height": "" + (window.innerHeight - 150),
                "dataFormat": "json",
                "dataSource": {
                    "chart": {
                        "caption": parsed_data[0][i].split("-")[0],
                        "yaxisname": parsed_data[0][i].split("-")[0] + " (in " + parsed_data[0][i].split("-")[1] + ")",
                        "xaxisname": "Timestamp",
                        "yaxisminValue": "0",
                        "yaxismaxValue": "0",
                        "forceAxisLimits" : "1",
                        "pixelsPerPoint": "0",
                        "pixelsPerLabel": "30",
                        "lineThickness": "1",
                        "compactdatamode" : "1",
                        "dataseparator" : "|",
                        "labelHeight": "50",
                        "numVisibleLabels": "10",
                        "theme": "fint"
                    },
                    "categories": [{
                        "category": timestamps
                    }],
                    "dataset": [{
                        "data": data
                    }]
                }
            });
            charts[charts.length-1].render();
        }

    }
}

// Handle toggling of the Sidebar
function toggle_sidebar() {
    var sidebar = document.getElementById("sidebar");
    var map_canvas = document.getElementById("map-canvas");

    if (sidebar_visible) {
        sidebar.style.display = "none";
        sidebar_visible = false;

        map_canvas.style.marginRight = "0px";
        google.maps.event.trigger(map, "resize");
    }
    else {
        sidebar.style.display = "block";
        sidebar_visible = true;

        map_canvas.style.marginRight = "300px";
        google.maps.event.trigger(map, "resize");
    }
}

// Close the graph div if its open
function close_graphs() {
    var graph_div = document.getElementById("graph-popup");
    graph_div.style.display = "none";
}

// Handle resizing of the window for elements that need to be resize (graph popup div)
function handle_resize(event) {
    var graph_div = document.getElementById("graph-popup");
    if (graph_div.style.display == "block") {
        graph_div.style.height = window.innerHeight - 100 + "px";
        graph_div.style.width = window.innerWidth - 100 + "px";

        for (var i = 0; i < charts.length; i++) {
            charts[i].resizeTo(800, window.innerHeight - 150);
        }
    }
}

// Begin the App
initialize();
