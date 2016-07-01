// Footer of the chart, which contains the credit and source text.
// This component is special because it must drop the source text to its own
// line when the text gets too long, and it must wrap the text when it then
// exceeds the width of the chart area.

var React = require("react");
var ReactDom = require("react-dom")
var PropTypes = React.PropTypes;
var SvgText = require("./SvgText.jsx");
var update = require("react-addons-update");

/**
 * Render a footer with the chart credit and source
 * @instance
 * @memberof RendererWrapper
 */
var ChartFooter = React.createClass({

	propTypes: {
		metadata: PropTypes.object,
		extraHeight: PropTypes.number,
		translate: PropTypes.object,
		onUpdate: PropTypes.func,
		chartWidth: PropTypes.number
	},

	getInitialState: function() {
		return {
			creditDimensions: {
				width: 0,
				height: 0
			},
			pixelsPerCharacter: 0
		};
	},

	shouldComponentUpdate: function(nextProps, nextState) {
		return true;
	},

	_config: {
		creditSourcePadding: 20,
		heightPerLine: 20,
		sampleString: "Data: abcdefg hijkl mnop qrstu vwxyz 1234 56789"
	},

	_handleStateUpdate: function(k, v) {
		var newValue = {};
		newValue[k] = v;
		this.setState(update(this.state, { $merge: newValue }));
	},

	_createSourceLine: function() {
		var sourceText;
		var sourceLine;
		if (this.props.metadata.source && this.props.metadata.source !== "") {
			sourceText = "Source: " + this.props.metadata.source;
		} else {
			sourceText = "";
		}

		if (this.props.metadata.notes && this.props.metadata.notes !== "") {
			sourceLine = [sourceText, this.props.metadata.notes].join(" | ");
		} else {
			sourceLine = sourceText;
		}

		return sourceLine;
	},

	_createCreditLine: function() {
		var creditText;

		if (this.props.metadata.credit === "" || this.props.metadata.credit === "Your name") {
			creditText =  "@latimesgraphics";
		} else {
			creditText = this.props.metadata.credit + " / @latimesgraphics";
		}
		return creditText;
	},

	render: function() {
		var sourceLineText = this._createSourceLine();
		var chartSource = null;
		var chartCredit;
		if (sourceLineText.length > 0) {
			chartSource = (
				<ChartSourceText
					text={sourceLineText}
					creditSourcePadding={this._config.creditSourcePadding}
					className="svg-text-source"
					translate={this.props.translate}
					heightPerLine={this._config.heightPerLine}
					extraHeight={this.props.extraHeight}
					creditMargin={this.props.creditMargin}
					creditDimensions={this.state.creditDimensions}
					pixelsPerCharacter={this.state.pixelsPerCharacter}
					chartWidth={this.props.chartWidth}
					updateState={this._handleStateUpdate}
					onUpdate={this.props.onUpdate}
				/>
			);
		}

		var creditLineText = this._createCreditLine();
		chartCredit = (
			<ChartCreditText
				text={creditLineText}
				className="svg-text-credit"
				onUpdate={this.props.onUpdate}
				translate={[this.props.translate.right, this.props.translate.bottom]}
				updateState={this._handleStateUpdate.bind(null, "creditWidth")}
			/>
		);

		return (
			<g className={this.props.className}>
				<HiddenPixelMeasure
					sampleString={this._config.sampleString}
					pixelsPerCharacter={this.state.pixelsPerCharacter}
					onUpdate={this._handleStateUpdate.bind(null, "pixelsPerCharacter")}
				/>
				{chartCredit}
				{chartSource}
			</g>
		);
	}

});

// Credit text
var ChartCreditText = React.createClass({

	componentDidMount: function() {
		var node = ReactDom.findDOMNode(this);
		var bbox = node.getBBox();
		this.props.updateState(bbox.width);
	},

	render: function() {
		var classNameDirection = "right";

		return (
			<SvgText
				text={this.props.text}
				translate={this.props.translate}
				className={"svg-text-credit " + classNameDirection}
			/>
		);
	}
});

// Source text
var ChartSourceText = React.createClass({

	getInitialState: function() {
		// We want the soruce to appear on it's own line in smaller charts
		var onOwnLine = (this.props.chartWidth >= 630) ? false : true;

		return {
			ownLine: onOwnLine // whether source will fall onto its own line
		}
	},

	_handleHeightUpdate: function(height) {
		this.props.onUpdate(height);
	},

	// Listen for chart size change, and set ownLine property to adjust
	componentWillReceiveProps: function(nextProps) {
		if (nextProps.chartWidth !== this.props.chartWidth) {
			var onOwnLine = (nextProps.chartWidth >= 630) ? false : true;
			this.setState({ownLine: onOwnLine});
		}
	},

	render: function() {
		var _translate = this.props.translate;
		var translate;
		var classNameDirection = "left"; // We always want source on the left
		var maxWidth;

		if (this.state.ownLine) {
			translate = [_translate.left, _translate.bottom - this.props.heightPerLine];
			maxWidth = this.props.chartWidth;
		} else {
			translate = [_translate.left, _translate.bottom];
			maxWidth = this.props.chartWidth - this.props.creditDimensions.width - this.props.creditSourcePadding;
		}

		return (
			<SvgText
				text={this.props.text}
				wrap={false}
				heightPerLine={this.props.heightPerLine}
				pixelsPerCharacter={this.props.pixelsPerCharacter}
				maxWidth={this.props.chartWidth}
				translate={translate}
				onUpdate={this._handleHeightUpdate}
				className={"svg-text-source " + classNameDirection}
			/>);
	}
});

// Hidden element that renders the text of parent's `sampleString` and sets in
// parent state the sample string's width per character.
var HiddenPixelMeasure = React.createClass({

	componentDidMount: function() {
		var textLength = ReactDom.findDOMNode(this).getComputedTextLength();
		this.props.onUpdate(textLength / this.props.sampleString.length);
	},

	componentDidUpdate: function() {
		var textLength = ReactDom.findDOMNode(this).getComputedTextLength();
		var ppc = textLength / this.props.sampleString.length;
		if (ppc !== this.props.pixelsPerCharacter) {
			this.props.onUpdate(ppc);
		}
	},

	render: function() {
		return (
			<text className="hidden-svg svg-text svg-text-source">
				{this.props.sampleString}
			</text>
		);
	}

});

module.exports = ChartFooter;
