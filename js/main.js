// The google map object
var map;
// Current polylines drawn
var polylines = [];
// Start and end Marker
var start_marker;
var end_marker;
var event_markers = [];

// Regular expression for log files
var log_extension = /.*\.(log)$/;
// Array of Log_File_Info
var logs = [];

// Array of Charts
var charts = [];

// Regular expression for
var picture_extension = /.*\.(jpg)|(bmp)$/;
// Array of Pic_File_Info
var images = [];

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
    var mapOptions = {
        center: { lat: 30.618989, lng: -96.338653},
        zoom: 16,
        streetViewControl: true,
        panControl: false,
        zoomControl: false,
        minZoom: 3
    };
    // Create the map
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    // Add listener for resizing window
    window.addEventListener("resize", handle_resize);

    // Initial resize to fix Bootstrap size to fill whole area
    handle_resize();

    // Set the proper width of menu buttons
}

// Prevent Menu Lists from closing on clicking
function stop(e) {
    if (!e)  e = window.event;
    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();
}
$(".dropdown-menu").click(stop);

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
        var table = document.createElement("table");
        table.setAttribute("class", "infotable");
        var first_row = table.insertRow(0);
        var time = first_row.insertCell(0);
        time.colSpan = 2;
        time.innerHTML = parse_timestamp(parsed_data[index][0]);
        for (i = 3; i < parsed_data[0].length; i++) {
            var row = table.insertRow(i - 2);
            if (parsed_data[0][i] != "Events") {
                row.insertCell(0).innerHTML = parsed_data[0][i].split('-')[0] + ": ";
                row.insertCell(1).innerHTML = parsed_data[index][i] + " " + parsed_data[0][i].split('-')[1];
            }
            else {
                row.insertCell(0).innerHTML = parsed_data[0][i] + ": ";
                row.insertCell(1).innerHTML = get_event(parsed_data[index][i]);
            }
        }

        var timestamp = parseInt(parsed_data[index][0]);
        var time_diff = 5000;
        var img_index = -1;
        for (i = 0; i < images.length; i++) {
            var diff = Math.abs(timestamp - parseInt(images[i].filename.substr(0, images[i].filename.length - 4)));
            if (diff < time_diff) {
                //console.log(timestamp + " - " + parseInt(images[i].filename.substr(0, images[i].filename.length - 4)) + " = " + diff);
                img_index = i;
                time_diff = diff;
            }
        }
        if (img_index != -1) {
            var img_cell = first_row.insertCell(1);
            img_cell.rowSpan = parsed_data[0].length - 2;
            img_cell.appendChild(images[img_index].img);
        }

        click_info.setPosition(new google.maps.LatLng(parsed_data[index][1], parsed_data[index][2]));
        click_info.setContent(table);
        click_info.open(map);

        // Fix Info box sometimes not being the right size by opening it again after short delay
        setTimeout(function() {
            click_info.open(map);
        }, 100);
    }
}

var legend = document.createElement("div");
legend.id = "legend";
$(".nav.navbar-nav.side-nav")[0].appendChild(legend);

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

    // Get set of only valid data
    var validset = [];
    for (i = 0; i < data.length; i++) {
        if (!isNaN(data[i])) {
            validset[validset.length] = data[i];
        }
    }

    // Get the minimum and maximum data values from the valid data
    var min = Math.min.apply(Math, validset);
    var max = Math.max.apply(Math, validset);

    // Find the points to divide the line by color
    var color_division = [];
    for (i = 0; i < colors.length - 1; i++) {
        color_division[i] = min + (i + 1) * (max - min) / colors.length;
    }
    color_division[color_division.length] = max;

    // No data color
    colors[colors.length] = "#AAAAAA";

    // Add legend to legend div and un-hide it
    legend.innerHTML = quantity + "<br>";
    legend.style.display = "block";

    var start_img = document.createElement("img");
    start_img.src = "img/startPosition.png";
    start_img.width = 20;
    start_img.height = 20;
    legend.appendChild(start_img);
    legend.innerHTML = legend.innerHTML + " Start ";

    var end_img = document.createElement("img");
    end_img.src = "img/endPosition.png";
    end_img.width = 20;
    end_img.height = 20;
    legend.appendChild(end_img);
    legend.innerHTML = legend.innerHTML + " End<br>";

    if (min == Infinity) {
        var legend_box = document.createElement("div");
        legend_box.className = "legend-box";
        legend_box.style.backgroundColor = colors[colors.length -1];
        legend.appendChild(legend_box);
        legend.innerHTML = legend.innerHTML + " No Data<br>";
    }
    else {
        if (validset.length < data.length) {
            legend_box = document.createElement("div");
            legend_box.className = "legend-box";
            legend_box.style.backgroundColor = colors[colors.length -1];
            legend.appendChild(legend_box);
            legend.innerHTML = legend.innerHTML + " No Data<br>";
        }
        for (i = 0; i < color_division.length; i++) {
            legend_box = document.createElement("div");
            legend_box.className = "legend-box";
            legend_box.style.backgroundColor = colors[i];
            legend.appendChild(legend_box);
            if (i == 0) {
                legend.innerHTML = legend.innerHTML + " " + Math.round(min) + " - " + Math.round(color_division[i]) + " " + unit + "<br>";
            }
            else {
                legend.innerHTML = legend.innerHTML + " " + Math.round(color_division[i - 1] + 1) + " - " + Math.round(color_division[i]) + " " + unit + "<br>";
            }
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

        if (isNaN(data[i])) {
            this_color = colors.length - 1;
        }
        else {
            for (j = 0; j < color_division.length; j++) {
                if (data[i] <= color_division[j]) {
                    this_color = j;
                    break;
                }
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

function get_event(event_id) {
    if (isNaN(event_id) || event_id == 0) {
        return "None";
    }
    else if (event_id == 1) {
        return "Braking";
    }
    else if (event_id == 2) {
        return "Acceleration";
    }
    else {
        return "Undefined";
    }
}

function event_click(event) {
    var latlng = event.latLng;
    var minDistance = 999999999999;
    var i;

    var marker = -1;

    for(i = 0; i < event_markers.length; i++) {
        var dist = Math.sqrt(Math.pow((latlng.lat() - event_markers[i].position.lat()), 2) + Math.pow((latlng.lng() - event_markers[i].position.lng()), 2));
        if (dist < minDistance) {
            marker = event_markers[i];
            minDistance = dist;
        }
    }

    var log_select = document.getElementById("log_select_dropdown");
    var parsed_data = logs[log_select.selectedIndex].parsed_data;

    var table = document.createElement("table");
    table.setAttribute("class", "infotable");
    var first_row = table.insertRow(0);
    var time = first_row.insertCell(0);
    time.colSpan = 2;
    time.innerHTML = parse_timestamp(parsed_data[marker.path_ID][0]);
    for (i = 3; i < parsed_data[0].length; i++) {
        var row = table.insertRow(i - 2);
        if (parsed_data[0][i] != "Events") {
            row.insertCell(0).innerHTML = parsed_data[0][i].split('-')[0] + ": ";
            row.insertCell(1).innerHTML = parsed_data[marker.path_ID][i] + " " + parsed_data[0][i].split('-')[1];
        }
        else {
            row.insertCell(0).innerHTML = parsed_data[0][i] + ": ";
            row.insertCell(1).innerHTML = get_event(parsed_data[marker.path_ID][i]);
        }
    }

    var timestamp = parseInt(parsed_data[marker.path_ID][0]);
    var time_diff = 5000;
    var img_index = -1;
    for (i = 0; i < images.length; i++) {
        var diff = Math.abs(timestamp - parseInt(images[i].filename.substr(0, images[i].filename.length - 4)));
        if (diff < time_diff) {
            img_index = i;
            time_diff = diff;
        }
    }

    if (img_index != -1) {
        var img_cell = first_row.insertCell(1);
        img_cell.rowSpan = parsed_data[0].length - 2;
        img_cell.appendChild(images[img_index].img);
    }

    click_info.setPosition(new google.maps.LatLng(parsed_data[marker.path_ID][1], parsed_data[marker.path_ID][2]));
    click_info.setContent(table);
    click_info.open(map);

    // Fix Info box sometimes not being the right size by opening it again after short delay
    setTimeout(function() {
        click_info.open(map);
    }, 100);
}

function draw_events (path, data) {
    // Loop control
    var i;

    // Remove all current polylines from the map
    for (i = 0; i < polylines.length; i++) {
        polylines[i].setMap(null);
    }
    polylines = [];

    // Add legend to legend div and un-hide it
    legend.innerHTML = "Events <br>";
    legend.style.display = "block";

    var start_img = document.createElement("img");
    start_img.src = "img/startPosition.png";
    start_img.width = 20;
    start_img.height = 20;
    legend.appendChild(start_img);
    legend.innerHTML = legend.innerHTML + " Start ";

    var end_img = document.createElement("img");
    end_img.src = "img/endPosition.png";
    end_img.width = 20;
    end_img.height = 20;
    legend.appendChild(end_img);
    legend.innerHTML = legend.innerHTML + " End<br>";

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

    polylines[polylines.length] = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: "#AAAAAA",
        strokeOpacity: 1.0,
        strokeWeight: 5,
        zIndex: 100
    });

    polylines[polylines.length - 1].setMap(map);
    google.maps.event.addListener(polylines[polylines.length-1], 'click', polyline_click);

    // Remove event markers
    for (i = 0; i < event_markers.length; i++) {
        event_markers[i].setMap(null);
    }
    event_markers = [];

    show_event_markers(path, data);
}

function show_event_markers(path, data) {
    for (var i = 0; i < data.length; i++) {
        if (data[i] > 0) {
            event_markers[event_markers.length] = new google.maps.Marker({
                position: path[i],
                map: map,
                icon: {
                    url: "img/event.png",
                    anchor: new google.maps.Point(20, 20)
                },
                title: get_event(data[i]),
                cursor: get_event(data[i]),
                clickable: true,
                zIndex: 30
            });
            event_markers[event_markers.length - 1].path_ID = i + 1;
            google.maps.event.addListener(event_markers[event_markers.length - 1], 'click', event_click);
        }
    }
}

function toggle_events() {
    if (event_markers.length > 0) {
        // Remove event markers
        for (i = 0; i < event_markers.length; i++) {
            event_markers[i].setMap(null);
        }
        event_markers = [];
    }
    else {
        var log_select = document.getElementById("log_select_dropdown");
        var log_file_info = logs[log_select.selectedIndex];
        var path = [];
        var data = [];

        var event_index = -1;
        for(var i = 3; i < log_file_info.parsed_data[0].length; i++) {
            if (log_file_info.parsed_data[0][i] == "Events") {
                event_index = i;
                break;
            }
        }
        for(i = 1; i < log_file_info.parsed_data.length; i++) {
            path[i-1] = new google.maps.LatLng(parseFloat(log_file_info.parsed_data[i][1]), parseFloat(log_file_info.parsed_data[i][2]));
            data[i-1] = parseFloat(log_file_info.parsed_data[i][event_index]);
        }
        show_event_markers(path, data);
    }
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
    if (log_file_info.parsed_data[0][data_selection] != "Events") {
        var quantity_unit = log_file_info.parsed_data[0][data_selection].split("-");
        draw_path(path, data, color, quantity_unit[0], quantity_unit[1]);
    }
    else {
        draw_events(path, data);
    }
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

        document.getElementById("event_toggler").style.display = "none";
        for (var i = 3; i < logs[log_select.selectedIndex].parsed_data[0].length; i++) {
            if (logs[log_select.selectedIndex].parsed_data[0][i] == "Events") {
                document.getElementById("event_toggler").style.display = "block";
            }
            var option = document.createElement("option");
            option.text = logs[log_select.selectedIndex].parsed_data[0][i].split("-")[0];
            data_select_dropdown.add(option);
        }

        // Hide the legend if it was shown
        legend.style.display = "none";

        // Remove all current polylines from the map
        for (i = 0; i < polylines.length; i++) {
            polylines[i].setMap(null);
        }
        polylines = [];

        // Hide Graphs If shown
        graph_div.style.display = "none";

        // Remove start and end marker if present
        if (start_marker) {
            start_marker.setMap(null);
            end_marker.setMap(null);
        }

        // Remove event markers
        for (i = 0; i < event_markers.length; i++) {
            event_markers[i].setMap(null);
        }
        event_markers = [];

        // Close infowindow
        click_info.setMap(null);

        // Select Select Log
        document.getElementById("menu-select-data").click();

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
        for (var j = 0; j < log_file_info.parsed_data[i].length; j++) {
            if (log_file_info.parsed_data[i][j].charCodeAt(0) == 13 || log_file_info.parsed_data[i][j].charCodeAt(0) == 10 || log_file_info.parsed_data[i][j].length == 0) {
                log_file_info.parsed_data[i].splice(j, 1);
            }
        }
    }
    for (i = 0; i < log_file_info.parsed_data.length; i++) {
        if (log_file_info.parsed_data[i].length < log_file_info.parsed_data[0].length) {
            log_file_info.parsed_data.splice(i, 1);
            i--;
        }
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

            // Clear the logs in the log select dropdown
            var log_select = document.getElementById("log_select_dropdown");
            if (log_select[0].text == "No Logs Loaded") {
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
                        for (var j = 0; j < log_select.length; j++) {
                            if (log_select[j].text == progress_event.target.filename) {
                                break;
                            }
                        }
                        if (j >= log_select.length) {
                            logs[logs.length] = new Log_File_Info();
                            logs[logs.length - 1].log_data = progress_event.target.result;
                            logs[logs.length - 1].filename = progress_event.target.filename;

                            var log_option = document.createElement("option");
                            log_option.text = logs[logs.length - 1].filename;
                            log_select.add(log_option);
                        }
                        else {
                            logs[j] = new Log_File_Info();
                            logs[j].log_data = progress_event.target.result;
                            logs[j].filename = progress_event.target.filename;
                        }
                    };

                    log_reader.readAsText(log_file, 'UTF8');
                }
            }

            // Select Load Pictures
            document.getElementById("menu-load-pictures").click();
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
            // Test each selected file to see if it is an image and create
            // a pic image info structure for it after reading it in
            for (var i = 0; i < pic_input.files.length; i++) {
                if (picture_extension.test(pic_input.files[i].name)) {
                    var pic_file = pic_input.files[i];
                    var pic_reader = new FileReader;
                    pic_reader.filename = pic_file.name;

                    pic_reader.onload = function (progress_event) {
                        for (var j = 0; j < images.length; j++) {
                            if (images[j].filename == progress_event.target.filename) {
                                break;
                            }
                        }
                        if (j >= images.length) {
                            images[images.length] = new Pic_File_Info();
                            images[images.length-1].img.setAttribute("src", progress_event.target.result);
                            images[images.length-1].img.style.width = "384px";
                            images[images.length-1].img.style.height = "216px";
                            images[images.length-1].filename = progress_event.target.filename;
                        }
                        else {
                            images[j] = new Pic_File_Info();
                            images[j].img.setAttribute("src", progress_event.target.result);
                            images[j].filename = progress_event.target.filename;
                        }
                    };

                    pic_reader.readAsDataURL(pic_file);
                }
            }

            // Select Log Select
            document.getElementById("menu-select-log").click();
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

function graph_scroll(event) {
    document.getElementById("graph-close-button").style.left = event.target.scrollLeft + "px";
}

var graph_div = document.createElement("div");
graph_div.id = "graph-popup";
document.getElementById("page-wrapper").appendChild(graph_div);
graph_div.addEventListener("scroll", graph_scroll);

function wheel_listener(event) {
    //wheelDelta is for chrome, detail is for firefox
    var wheelinfo;
    if(/Firefox/i.test(navigator.userAgent)) {
        wheelinfo = -1 * event.detail;
    }
    else {
        wheelinfo = event.wheelDelta;
    }

    if (graph_div.style.display == "block") {
        graph_div.scrollLeft -= wheelinfo;
    }
}

window.addEventListener("scroll", function(e) {console.log(e);});
var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
document.addEventListener(mousewheelevt, wheel_listener);

function show_graphs() {
    var log_select = document.getElementById("log_select_dropdown");
    if (log_select.length > 0 && log_select.value != "No Logs Loaded") {
        graph_div.style.display = "block";

        graph_div.style.height = window.innerHeight - 50 + "px";
        graph_div.style.top = "-" + (window.innerHeight - 50) + "px";

        var parsed_data = logs[log_select.selectedIndex].parsed_data;

        graph_div.innerHTML = '<button id="graph-close-button" onclick="close_graphs()">Close</button>';
        var table = document.createElement("TABLE");
        graph_div.appendChild(table);
        var i;

        var graph_row = table.insertRow(0);
        for (i = 3; i < parsed_data[0].length; i++) {
            if (parsed_data[0][i] != "Events") {
                var cell_graph = graph_row.insertCell(i - 3);
                cell_graph.innerHTML = '<div id="chart-' + (i - 2) + '"> </canvas>';
            }
        }

        var timestamps = "";
        for (i = 1; i < parsed_data.length-1; i++) {
            timestamps += parse_timestamp_no_ms(parsed_data[i][0]) + "|";
        }
        timestamps += parsed_data[parsed_data.length-1][0];

        charts = [];
        for (i = 3; i < parsed_data[0].length; i++) {
            if (parsed_data[0][i] != "Events") {
                var data = "";
                for (var j = 1; j < parsed_data.length - 1; j++) {
                    data += parsed_data[j][i] + "|";
                }
                data += parsed_data[parsed_data.length - 1][i];

                charts[charts.length] = new FusionCharts({
                    "type": "zoomline",
                    "renderAt": "chart-" + (i - 2),
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
                            "forceAxisLimits": "1",
                            "pixelsPerPoint": "0",
                            "pixelsPerLabel": "30",
                            "lineThickness": "1",
                            "compactdatamode": "1",
                            "dataseparator": "|",
                            "labelHeight": "50",
                            "numVisibleLabels": "10",
                            "theme": "fint"
                        },
                        "categories": [
                            {
                                "category": timestamps
                            }
                        ],
                        "dataset": [
                            {
                                "data": data
                            }
                        ]
                    }
                });
                charts[charts.length - 1].render();
            }
        }
    }
}

// Close the graph div if its open
function close_graphs() {
    graph_div.style.display = "none";
}

// Handle resizing of the window for elements that need to be resize (graph popup div)
function handle_resize() {
    if (graph_div.style.display == "block") {
        graph_div.style.height = window.innerHeight - 50 + "px";
        graph_div.style.top = "-" + (window.innerHeight - 50) + "px";
        for (var i = 0; i < charts.length; i++) {
            charts[i].resizeTo(800, window.innerHeight - 150);
        }
    }

    document.body.style.marginTop = 50 + "px";
    document.body.style.height = window.innerHeight - 50 + "px";
    document.getElementById("wrapper").style.height = window.innerHeight - 50 + "px";
    document.getElementById("page-wrapper").style.height =  window.innerHeight - 50 + "px";
}

// Begin the App
initialize();
