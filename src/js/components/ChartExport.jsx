// Export chart to PNG or SVG

var React = require('react');
var update = require("react-addons-update");
var cx = require("classnames");
var PropTypes = React.PropTypes;
var d3 = require("d3");

var Button = require("chartbuilder-ui").Button;
var saveSvgAsPng = require("save-svg-as-png");

function outerHTML(el) {
	var outer = document.createElement("div");
	outer.appendChild(el);
	return outer.innerHTML;
}

/**
 * ### Buttons that allow the user to export a chart to an image or Svg.
 * @instance
 * @memberof editors
 */
var ChartExport = React.createClass({

	propTypes: {
		stepNumber: PropTypes.string,
		svgWrapperClassName: PropTypes.string.isRequired,
		enableJSONExport: PropTypes.bool,
		sendBase64String: PropTypes.func
	},

	getDefaultProps: function() {
		return {
			enableJSONExport: false,
		};
	},

	getInitialState: function() {
		return {
			enableSvgExport: true,
		};
	},

	componentDidMount: function() {
		var enableSvgExport;
		var chartNode = null;

		// SVG output won't work on most non-Chrome browsers, so we try it first. If
		// `createSVGFile()` doesnt work we will disable svg download but still allow png.
		// TODO: figure out what exactly is breaking FF
		var chart = document
			.getElementsByClassName(this.props.svgWrapperClassName)[0]
			.getElementsByClassName("renderer-svg")[0];

		this.setState({
			chartNode: chart,
			enableSvgExport: true
		});
	},

	componentWillReceiveProps: function(nextProps) {
		var chart = document
			.getElementsByClassName(this.props.svgWrapperClassName)[0]
			.getElementsByClassName("renderer-svg")[0];

		this.setState({ chartNode: chart });
	},

	_addIDsForIllustrator: function(node) {
		var chart = d3.select(node);
		var classAttr = "";

		chart
			.attr("id","chartbuilder-export")
			.selectAll("g")
			.attr("id",function(d,i){
				try {
					classAttr = this.getAttribute("class").split(" ");
					return classAttr.join("::") + (classAttr == "tick" ? "::" + this.textContent : "");
				}
				catch(e) {
					return null;
				}
			});

		return chart[0][0];
	},

	_getDateString: function() {
		// Return date string as YYYY-MM-DD
		var d = new Date();
	    var dd = d.getDate();
	    var mm = d.getMonth()+1; //January is 0!
	    var yyyy = d.getFullYear();

	    if(dd<10){
            dd='0'+dd
        }
        if(mm<10){
            mm='0'+mm
        }
        var dateString = "-" + yyyy + "-" + mm + "-" + dd;
        return dateString;
	},

	_makeFilename: function(extension) {
		var filename = this.props.metadata.title.toLowerCase() + this._getDateString();
		return [
			filename.replace(/\s/g, "-"),
			extension
		].join(".");
	},

	downloadPNG: function() {
		filename = this._makeFilename("png");
		saveSvgAsPng.saveSvgAsPng(this.state.chartNode, filename, { scale: 2.0 });
	},

	_autoClickDownload: function(filename, href) {
		var a = document.createElement('a');
		a.download = filename;
		a.href = href;
		document.body.appendChild(a);
		a.addEventListener("click", function(e) {
			a.parentNode.removeChild(a);
		});
		a.click();
	},

	_saveSVGToServer: function(filename, uri) {
		var params = "name="+filename+"&svg="+encodeURIComponent(uri);
		var postrequest = new XMLHttpRequest();
		postrequest.open("POST", "http://stockserver.usa.tribune.com/chartbuilder-php/chartbuilder-writer-2.0.php", true);
		postrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		postrequest.send(params);
	},

	downloadSVG: function() {
		var filename = this._makeFilename("svg");
		var chart = this._addIDsForIllustrator(this.state.chartNode);
		var autoClickDownload = this._autoClickDownload;
		var saveSVGToServer = this._saveSVGToServer;
		saveSvgAsPng.svgAsDataUri(chart, {
			cleanFontDefs: true,
			fontFamilyRemap: {
				"Khula-Light": "Khula Light",
				"Khula-Regular": "Khula",
			}
		}, function(uri) {
			saveSVGToServer(filename, uri);
			autoClickDownload(filename, uri);
		});

	},

	downloadJSON: function() {

		json_string = JSON.stringify({
			chartProps: this.props.model.chartProps,
			metadata: this.props.model.metadata
		}, null, "\t")

		var filename = this._makeFilename("json");
		var href = "data:text/json;charset=utf-8," + encodeURIComponent(json_string);
		this._autoClickDownload(filename, href);
	},

	setAdvancedOptionState: function() {
		this.setState({
			showAdvancedOptions: !this.state.showAdvancedOptions
		});
	},

	render: function() {
		var self = this;

		var chartExportButtons = [
			<Button
				key="png-export"
				className="export-button"
				onClick={this.downloadPNG}
				text="PNG Image"
			/>
		];

		if (this.state.enableSvgExport) {
			chartExportButtons.push(
				<Button
					key="svg-export"
					className="export-button"
					onClick={this.downloadSVG}
					text="SVG"
				/>
			);
		}
		if (this.props.enableJSONExport) {
			chartExportButtons.push(
				<Button
					key="json-export"
					className="export-button"
					onClick={this.downloadJSON}
					text="JSON"
				/>
			);
		}

		return (
			<div className="editor-options">
				<h2><span className="step-number">{this.props.stepNumber}</span><span>Export your chart</span></h2>
					<div className="export-button-wrapper">
						{chartExportButtons}
					</div>
			</div>
		);
	}
})

module.exports = ChartExport;
