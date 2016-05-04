<?php
header("Access-Control-Allow-Origin: *");

// created on stockserver 2014-06-10
// SVG files go to: http://stockserver.usa.tribune.com/chartbuilder-svg/


// -----------------------------------
// SETTING PATHS

echo "<pre>";
$initial_log = "";
$initial_log .= "SETTING PATHS\n";

$initial_log .= "This file's location here = " . __FILE__ . "\n"; // showing getter_header

$path_file_dir = __DIR__; //  -120612
$initial_log .= "File in this directory (\$path_file_dir), should be absolute = " . $path_file_dir . "\n";

if (function_exists('chdir')) {
    $initial_log .= "chdir functions are available: function_exists('chdir')\n";
} else {
    $initial_log .= "chdir functions are not available: function_exists('chdir')\n\n";
}

chdir($path_file_dir);
$initial_log .= "chdir(\$path_file_dir) = " . $path_file_dir . "\n";
$initial_log .= "\n";



// -----------------------------------
// ADDING EXTERNAL DEPENDENCIES
// require_once "../../sites_shared/develop_shared.php";

function format_date($dateobj) {
	return date("Y-m-d", $dateobj);
}

function format_date_time($dateobj) { // -050212
	return date("Y-m-d\_H-i-s\_T", $dateobj);
}

function unix_2_pretty($timestamp_integer) {
	return date('F j\, Y g:i:s a T', $timestamp_integer);
}


// -----------------------------------
// FUNCTIONS AND VARIABLES

$path_to_data_folder = $path_file_dir . "/chartbuilder-storage/";
$initial_log .= "\$path_to_data_folder= " . $path_to_data_folder . "\n";

// CREATE new directories -022113 (key rates script)
// http://stackoverflow.com/questions/3351670/create-new-folder-with-php
if(!is_writable($path_to_data_folder)) { // Check if the parent directory is writeable
    die("\nUnable to write \$path_to_data_folder folder, permissions denied.\n" . $path_to_data_folder);
} else {
	$initial_log .= "\n$path_to_data_folder is writable\n";
}

echo $initial_log;
echo "</pre>";


// DATE:
$today_date = time();
$today_date_format = format_date($today_date);
$today_date_time_format = format_date_time($today_date);

echo "Today's unix time is " . $today_date . "<br />";
echo "Today's date is " . format_date($today_date) . "<br />";
echo "Today's date time is " . $today_date_time_format . "<br />";


$postMsg = "Status: no data input yet\n";

echo "\n\n\n--------------------\n";


$toggle = false;


	if ($_POST) {
        echo "WE HAVE A POST";

		$rawPostText = (string) $_POST;
		// http://stackoverflow.com/questions/406316/how-to-pass-data-from-javascript-to-php-and-vice-versa
		$name = trim((string) $_POST['name']); // must be a resource, can't convert array (_POST is an array) to string
		$slug = trim((string) $_POST['slug']);
		$data = trim((string) $_POST['filedata']);

		if ( strlen($name) < 1) {
			$toggle = false;
			$postMsg .= "Status: No name was entered\n";
		} else {
			$toggle = true;
		}
		if ( strlen($data) < 10) {
			$toggle = false;
			$postMsg .= "Status: No svg was entered\n";
		} else {
			$toggle = true;
			$postMsg .= "name of graphic = $name\n";
		}
	} // end of _POST if

	if ($toggle) {
		$postMsg .= "Status: DATA POSTED!\n";
		//echo "You have reached line " . __LINE__ . " of file " . __FILE__;
		//print_r($_POST);
		echo "<pre>";

		$file_path = $path_to_data_folder;

		$dir = $slug;
		if ( is_dir($path_to_data_folder . $dir) === false) {
			mkdir($path_to_data_folder . $dir);
		}

		$file_path .= $dir . '/' . $name;
		$postMsg .= "\nCopying SVG TEXT from \$svg to svg file for localhost archive.\n\n";
		$postMsg .= "PATH: $file_path\n";

		$postMsg .= "TIME: " . unix_2_pretty($_SERVER['REQUEST_TIME']) . "\n";
		// http://stackoverflow.com/questions/6837655/log-user-ip-address-date-and-time
		// http://www.phpbook.net/how-to-log-ip-adresses-in-php.html
		$postMsg .= "IP Address: $_SERVER[REMOTE_ADDR]\n";
		$postMsg .= "Proxy: $_SERVER[HTTP_X_FORWARDED_FOR]\n";
		// $postMsg .= "PAGE: $_SERVER[SCRIPT_NAME]\n"; // no quotes
		$postMsg .= "Host: $_SERVER[REMOTE_HOST]\n";
		$postMsg .= "Port: $_SERVER[REMOTE_PORT]\n";
		$postMsg .= "User: $_SERVER[REMOTE_USER]\n";
		$postMsg .= "BROWSER: $_SERVER[HTTP_USER_AGENT]\n";
		$postMsg .= "Arguments: " . print_r($_SERVER['argv']) . "\n";
		$postMsg .= "Server address: $_SERVER[SERVER_ADDR]\n";
		$postMsg .= "Server name: $_SERVER[SERVER_NAME]\n";
		$postMsg .= "Server software: $_SERVER[SERVER_SOFTWARE]\n";
		$postMsg .= "Server prt: $_SERVER[SERVER_PORT]\n";
		$postMsg .= "Request: $_SERVER[REQUEST_METHOD]\n";
		$postMsg .= "Referer: $_SERVER[HTTP_REFERER]\n";


		// Split the file if it has a base64 encoding prefix
		// SVG and PNG files will come in with the prefix.
		// JSON files won't, but we want to be able to handle them all.
		if (strpos($data, "base64,")) {
	        $data = explode("base64,", $data);
			$data_decoded = base64_decode(rawurldecode($data[1]));

		} else {
			$data_decoded = base64_decode(rawurldecode($data));
		}

		file_put_contents($file_path, $data_decoded);

		chmod($file_path, 0777);

	} else {
	}// end of overall post if






// // Walk through folder structure, writing folder name to a list of slugs
// function scan_dir($dir) {
//     $ignored = array('.', '..', '.DS_Store','.svn', '.htaccess', '*.png', '*.txt', '*.svg', '*.json');

//     $files = array();
//     foreach (scandir($dir) as $file) {
//         if (in_array($file, $ignored)) continue;
// 	    echo $file;
//         $files[$file] = filemtime($dir . '/' . $file);
//     }

//     arsort($files);
//     $files = array_keys($files);

//     $initial_log .= $files;
//     return ($files) ? $files : false;
// }
// scan_dir($path_to_data_folder);


    
	$dirarray = scandir($path_file_dir . "/chartbuilder-storage");
	$slugs_filename = $path_file_dir . "/slugs-list.txt";
	$slugs_list_file = fopen("$slugs_filename", 'w');
	$slugs_list = "";
    
	$ignored = array('.', '..', '.DS_Store', '.svn', '.htaccess', '*.png', '*.txt', '*.svg', '*.json');
    
// http://stackoverflow.com/questions/11923235/scandir-to-sort-by-date-modified

    $postMsg .= "\n\noriginal_slugs\n";
    
    $files = array();
    
    filemtime($dir . '/' . $file);

	foreach ($dirarray as $value) {
		if (in_array($value, $ignored)) continue;
        $files[$value] = filemtime($path_file_dir . "/chartbuilder-storage/" . $value);
        $postMsg .= $value . " | " .  $files[$value] . "\n";
	}
    

    arsort($files);
    $files = array_keys($files);
    
    
    foreach ($files as $value_slug) {
    	$slugs_list .= $value_slug . "\n";
    }
    

	$postMsg .= "\n\nslugs_list\n" . $slugs_list . "\n";
	fwrite($slugs_list_file, $slugs_list);
	fclose($slugs_list_file);





	$path_to_log_folder = $path_file_dir . "/chartbuilder-log/";
	$file_path = $path_to_log_folder . "log_" . $today_date_time_format . ".txt";
	$postMsg .= "\nCopying log files to $file_path... \n";
	$initial_log .= $postMsg;
	$file_local = fopen("$file_path", 'w');

	$written = fwrite($file_local, $initial_log);
	if (!$written) break;
	fclose($file_local);
	chmod($file_path , 0777);

    // for debugging
    echo $_POST;

?>

