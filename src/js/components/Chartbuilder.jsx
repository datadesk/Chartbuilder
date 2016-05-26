/*
 * ### Chartbuilder.jsx
 * Parent Chartbuilder component. Queries stores for state on update and sends
 * updates to children
*/

/* Node modules */
var React = require("react");
var update = require("react-addons-update");
var PropTypes = React.PropTypes;

/* Flux stores */
var ChartPropertiesStore = require("../stores/ChartPropertiesStore");
var ChartMetadataStore = require("../stores/ChartMetadataStore");
var SessionStore = require("../stores/SessionStore");
var ErrorStore = require("../stores/ErrorStore");

/*
 * Global React components that are used irrespective of chart type
 * More info within each component's definition.
*/
var Canvas = require("./Canvas.jsx");
var ChartExport = require("./ChartExport.jsx");
var ChartMetadata = require("./ChartMetadata.jsx");
var ChartTypeSelector = require("./ChartTypeSelector.jsx");
var RendererWrapper = require("./RendererWrapper.jsx");
var LocalStorageTimer = require("./LocalStorageTimer.jsx");
var Instructions = require("./Instructions.jsx");

var AlertGroup = require("chartbuilder-ui").AlertGroup;

var svgWrapperClassName = {
	desktop: "renderer-svg-desktop",
	mobile: "renderer-svg-mobile"
};

// Associates a given chart type with its Editor and Renderer components.
var chartEditors = require("../charts/editors");
var numColors = require("../config/chart-style").numColors;

/* API to localStorage that allows saving and retrieving charts */
var ChartbuilderLocalStorageAPI = require("../util/ChartbuilderLocalStorageAPI");
var validateChartModel = require("../util/validate-chart-model");
var ChartServerActions = require("../actions/ChartServerActions");

/**
 * Function to query Flux stores for all data. Runs whenever the stores are
 * updated, usually by the Editor but occassionally by Renderers that allow
 * direct editing of the chart, eg draggable legend labels in `XYRenderer.jsx`
 * @name Chartbuilder#getStateFromStores
 * @returns {Object} Chartbuilder state
*/
function getStateFromStores() {
	return {
		chartProps: ChartPropertiesStore.getAll(),
		metadata: ChartMetadataStore.getAll(),
		errors: ErrorStore.getAll(),
		session: SessionStore.getAll()
	};
}

/**
 * ### Chartbuilder parent component
 * @name Chartbuilder
 * @class
 * @property {boolean} autosave - Save to localStorage after every change
 * @property {boolean} showMobilePreview - Show mobile preview underneath default chart
 * @property {function} onStateChange - Callback when state is changed
 * @property {Object} additionalComponents - Optional additional React components
 * @property {string} renderedSVGClassName - Optional class name for chart SVG class
 * @property {function} validateMeta - validate function that passes in the metadata where you can return an array of errors to be render under the ChartMeta ie: [{
 * 				location : "",
 *				text : "The title field is empty",
 *				type : "error"
 *			}]
 * @example
 * var React = require("react");
 * var Chartbuilder = require("./components/Chartbuilder.jsx");
 * var container = document.querySelector(".chartbuilder-container");
 *
 * React.render(
 *   <Chartbuilder
 *     autosave={true}
 *     showMobilePreview={true}
 *   />,
 * container );
*/
var Chartbuilder = React.createClass({

	propTypes: {
		autosave: PropTypes.bool,
		showMobilePreview: PropTypes.bool,
		onSave: PropTypes.func,
		onStateChange: PropTypes.func,
		validateMeta: PropTypes.func,
		additionalComponents: PropTypes.shape({
			metadata: PropTypes.array,
			misc: PropTypes.object
		}),
		renderedSVGClassName: React.PropTypes.string
	},

	getQueryVariable: function(v) {
		var q = window.location.search.substring(1);
		var vars = q.split("&");
		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split("=");
			if (decodeURIComponent(pair[0]) === v) {
				return decodeURIComponent([pair[1]]);
			}
		}
		return false;
	},

	loadDataFromUrl: function(url) {
		var client = new XMLHttpRequest();
		url = 'chartbuilder-storage/' + url.replace('.json', '') + '/' + url;
		url = url + "?v=" + Math.floor(Math.random() * 10000000000);
		client.open('GET', url);
		client.onreadystatechange = function() {
			if (client.readyState == 4) {
				var data = client.responseText;
				parsedModel = validateChartModel(client.responseText);
				if (parsedModel) {
					// Update flux store with incoming model
					ChartServerActions.receiveModel(parsedModel);
				}
			}
		}
        client.send();
	},

	getInitialState: function() {
		return getStateFromStores();
	},

	getDefaultProps: function() {
		return {
			autosave: true,
			additionalComponents: {
				metadata: [],
				misc: {}
			}
		};
	},

	/* Add listeners to update component state when stores update */
	componentDidMount: function() {
		ChartPropertiesStore.addChangeListener(this._onChange);
		ChartMetadataStore.addChangeListener(this._onChange);
		ErrorStore.addChangeListener(this._onChange);
		SessionStore.addChangeListener(this._onChange);

		// Check to see if there is a jsonurl parameter in the querystring
		// If so, load the data from that URL
		this.dataUrl = this.getQueryVariable('jsonurl');
		if (this.dataUrl) {
			this.loadDataFromUrl(this.dataUrl);
		}
	},

	/* Remove listeners on component unmount */
	componentWillUnmount: function() {
		ChartPropertiesStore.removeChangeListener(this._onChange);
		ChartMetadataStore.removeChangeListener(this._onChange);
		ErrorStore.removeChangeListener(this._onChange);
		SessionStore.removeChangeListener(this._onChange);
	},

	_validateMeta: function(meta) {
		if (meta && meta.title.trim() !== "" && meta.source.trim() !== "") {
			return [];
		} else {
			err = [{
				location: "input",
				text: "Your chart needs both a title and a source.",
				type: "error"
			}];
			return err;
		}
	},

	_renderErrors: function() {

		var metadataErrors = [];
		if (this._validateMeta()) {
			metadataErrors = this._validateMeta(this.state.metadata);
		}

		var errorArrMessage = this.state.errors.messages.concat(metadataErrors);
		var hasErrors = false;
		for (var i = 0; i < errorArrMessage.length; i++) {
			if (errorArrMessage[i].type === "error") {
				hasErrors = true;
			}
		}


		if (!hasErrors) {
			return (
		        <ChartExport
		        	data={this.state.chartProps.data}
		        	enableJSONExport={this.props.enableJSONExport}
		        	svgWrapperClassName={svgWrapperClassName.desktop}
		        	metadata={this.state.metadata}
		        	stepNumber={String(7)}
		        	additionalComponents={this.props.additionalComponents.misc}
		        	model={this.state}
		        />
			);
		} else {
			return (
				<div>
					<h2>Have a look at these issues before you export your chart:</h2>
					<AlertGroup
						alerts={errorArrMessage}
					/>
				</div>
			);
		}
	},

	/*
	 * Identify the chart type used and render its Editor. The corresponding
	 * Renderer is rendered within `RendererWrapper`, in case a Chartbuilder chart
	 * is being used as a module or without the editor.
	*/
	render: function() {
		var chartType = this.state.metadata.chartType;
		var Editor = chartEditors[chartType].Editor;

		// Check for mobile override settings and pass them in
		var MobileComponent = chartEditors[chartType].MobileOverrides;
		var mobileOverrides;
		if (MobileComponent && this.props.showMobilePreview) {
			mobileOverrides = (
				<MobileComponent
					chartProps={this.state.chartProps}
					errors={this.state.errors}
				/>
			);
		} else {
			mobileOverrides = null;
		}

		var editorSteps = Editor.defaultProps.numSteps + (this.state.chartProps.hasDate || this.state.chartProps.isNumeric ? 1 : 0);
		var mobilePreview;

		// Mobile preview of the chart, if told to render
		if (this.props.showMobilePreview) {
			mobilePreview = (
				<div className="mobile">
					<div className="phone-wrap">
						<div className="phone-frame">
							<RendererWrapper
								editable={true} /* will component be editable or only rendered */
								showMetadata={true}
								model={this.state}
								enableResponsive={true}
								className={svgWrapperClassName.mobile}
								svgClassName={this.props.renderedSVGClassName}
							/>
							<div></div>
						</div>
					</div>

				</div>
			);
		}
		return (
			<div className="chartbuilder-main">
				<div className="chartbuilder-renderer">
					<div className="desktop">
						<RendererWrapper
							editable={true} /* will component be editable or only rendered */
							model={this.state}
							enableResponsive={true}
							width={640}
							showMetadata={true}
							className={svgWrapperClassName.desktop}
							svgClassName={this.props.renderedSVGClassName}
						/>
					</div>
					{mobilePreview}
				</div>
				<div className="chartbuilder-editor">
				  	<Instructions/>
					<ChartTypeSelector
						metadata={this.state.metadata}
						chartProps={this.state.chartProps}
					/>
					<LocalStorageTimer
						timerOn={this.state.session.timerOn}
					/>
					<Editor
						errors={this.state.errors}
						session={this.state.session}
						chartProps={this.state.chartProps}
						numColors={numColors}
					/>
					<ChartMetadata
						metadata={this.state.metadata}
						data={this.state.chartProps.data}
						stepNumber={String(editorSteps + 2)}
						additionalComponents={this.props.additionalComponents.metadata}
					/>
					{mobileOverrides}
					{this._renderErrors()}
				</div>
				<div className="chartbuilder-canvas">
					<Canvas />
				</div>
			</div>
		);
	},

	/**
	 * Function that is fired any time a change is made to a chart. By default it
	 * fetches the latest chart state from the stores and updates the Chartbuilder
	 * component with that state. If `autosave` is set to `true`, it will also
	 * update `localStorage` with the new state.
	 * @name _onChange
	 * @instance
	 * @memberof Chartbuilder
	 */
	_onChange: function() {
		// On change, update and save state.
		var state = getStateFromStores();

		this.setState(state);

		if (this.props.autosave && !this.state.session.timerOn) {
			ChartbuilderLocalStorageAPI.saveChart(state);
		}

		// If Chartbuilder is embedded as a module,
		// accept onStateChange callback to update parent app
		if(this.props.onStateChange) {
			this.props.onStateChange({
				chartProps: state.chartProps,
				metadata: state.metadata
			});

		}

	}

});

module.exports = Chartbuilder;
