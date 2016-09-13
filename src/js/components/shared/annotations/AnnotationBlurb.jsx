var React = require('react');
var ReactDom = require("react-dom");

var swoopyArrow = require("swoopyarrows").swoopy;
var merge = require("lodash/merge");

var AnnotationBlurb = React.createClass({

	propTypes: {
		index: React.PropTypes.number.isRequired,
		tout: React.PropTypes.string,
		copy: React.PropTypes.string,
		pos: React.PropTypes.object,
		arrow: React.PropTypes.object,
		onBlurbUpdate: React.PropTypes.func,
		dimensions: React.PropTypes.object,
		margin: React.PropTypes.object,
		offset: React.PropTypes.object,
		direct: React.PropTypes.bool,
		editable: React.PropTypes.bool,
		toRelative: React.PropTypes.func.isRequired,
		fromRelative: React.PropTypes.func.isRequired,
		relPosKey: React.PropTypes.string
	},

	getDefaultProps: function() {
		return {
			index: null,
			tout: "",
			copy: "",
			pos: {x: 0, y: 0, point: {x: 0, y: 0}, val:{}},
			x: function(d){return d},
			y: function(d){return d},
			hasArrow: true,
			arrow: {
				start: {point:{x: 10, y: 50}, val:{x: 0, y:0}, pct: {x:0, y:0}},
				end: {point: {x: 20, y: 100}, val:{x: 0, y:0}, pct: {x:0, y:0}},
				snapTo: null,
				clockwise: true
			}
		};
	},

	getInitialState: function() {
		var proPPos = this._toRelative(this.props.pos)
		var arrow = this.props.arrow;
		arrow.end.point = this._fromRelative(this.props.arrow.end[this.props.relPosKey],null,proPPos)
		arrow.start.point = this._fromRelative(this.props.arrow.start[this.props.relPosKey],null,proPPos)
		this.props.arrow = arrow;

		return this.stateFromProps();
	},

	stateFromProps: function(props) {
		if(!props) {
			props = this.props
		}

		return {
			dragging: false,
			clickOrigin: {x: 0, y: 0},
			tout: this.props.tout,
			target: null,
			copy: this.props.copy,
			pos: this.props.pos,
			arrow: this.props.arrow,
			updatingFromInline: false
		}
	},

	shouldComponentUpdate: function(nextProps, nextState) {
		var newProps = (this.props !== nextProps);
		var newDrag = (this.state.dragging !== nextState.dragging);

		return !this.state.updatingFromInline && (newProps || newDrag || nextState.dragging);
	},

	componentDidMount: function() {
		this._placeArrow();
		this.props.arrow = this._arrowPointFromPct();
	},

	componentDidUpdate: function(prevProps, prevState) {
		this.props.arrow = this._arrowPointFromPct();

	},

	componentWillReceiveProps: function(nextProps) {
		this.setState({
			arrow: this._arrowPointFromPct(nextProps)
		})	

	},

	componentWillUpdate: function(nextProps, nextState) {
		if(!this.state.updatingFromInline && !this.state.dragging) {
			this.setState({
				tout: nextProps.tout,
				copy: nextProps.copy
			})
		}

		if(!this.state.dragging) {
			this._placeArrow();
		}

		if(nextProps.editable === true) {
			if(nextState.dragging && !this.state.dragging) {
				this._addDragEvents();
			} else if (!nextState.dragging && this.state.dragging) {
				this._removeDragEvents();
			}	
		}
	},

	_arrowPointFromPct: function(props) {
		if(!props) {
			props = this.props;
		}
		var proPPos = this._toRelative(props.pos)
		var arrow = props.arrow;
		arrow.end.point = this._fromRelative(props.arrow.end[this.props.relPosKey],null,proPPos)
		arrow.start.point = this._fromRelative(props.arrow.start[this.props.relPosKey],null,proPPos)
		return arrow
	},

	_getMousePosition: function(e) {
		// get SVG mouse position accounting for the location of parent
		// see https://stackoverflow.com/questions/10298658/mouse-position-inside-autoscaled-svg
		// and https://github.com/mbostock/d3/blob/master/src/event/mouse.js
		var parent = this.state.parent;
		var rect = parent.getBoundingClientRect();
		var pos = {
			x: e.clientX - rect.left - parent.clientLeft,
			y: e.clientY - rect.top - parent.clientTop
		};
		return pos;
	},

	_handleMouseDownForDraggableElements: function(e, target) {
		if(e.button !== 0) { return; }

		this.setState({
			dragging: true,
			target: target,
			clickOrigin: this._getMousePosition(e)
		})

		e.stopPropagation();
		e.preventDefault();
	},

	_handleInterfaceMouseDown: function(e) {
		this._handleMouseDownForDraggableElements(e, "pos")
	},

	_handleArrowEndMouseDown: function(e) {
		this._handleMouseDownForDraggableElements(e, "arrowEnd")
	},

	_handleArrowStartMouseDown: function(e) {
		this._handleMouseDownForDraggableElements(e, "arrowStart")
	},

	_handleMouseMove: function(e) {
		if(!this.state.dragging) { return; }
		var mousePos = this._getMousePosition(e);
		var delta = {
			x: (mousePos.x - this.state.clickOrigin.x),
			y: (mousePos.y - this.state.clickOrigin.y)
		}

		var newPos;
		var stateUpdate = {};
		switch(this.state.target) {
			case "pos":
				propPos = this.props.pos
				stateUpdate = {
					pos: {
						x: propPos.x + delta.x,
						y: propPos.y + delta.y
					},
					arrow: merge({}, this.state.arrow, {
						end: {
							point: {
								x: this.props.arrow.end.point.x - delta.x,
								y: this.props.arrow.end.point.y - delta.y
							}
						}
					})
				}



				this.setState(stateUpdate)
				break

			case "arrowEnd":
				propPos = this.props.arrow.end.point
				newPos = {
					point: {
						x: propPos.x + delta.x,
						y: propPos.y + delta.y,
					}
				}
				newPos[this.props.relPosKey] = this._toRelative(newPos.point,null,this.props.pos)

				this.setState({
					arrow: merge({}, this.state.arrow, {end: newPos})
				})
				break

			case "arrowStart":
				propPos = this.props.arrow.start.point;
				newPos = {
					point: {
						x: propPos.x + delta.x,
						y: propPos.y + delta.y,
					}
				}
				newPos[this.props.relPosKey] = this._toRelative(newPos.point,null,this.props.pos)

				this.setState({
					arrow: merge({}, this.state.arrow, {start: newPos})
				})

				break

			default:
		}

		e.stopPropagation();
		e.preventDefault();

	},

	_handleMouseUp: function(e) {
		var pos;
		var target = this.state.target;

		this.setState({
			dragging: false,
			target: null
		})

		switch(target) {
			case "pos":
				pos = this.state.pos;
				break
			case "arrowEnd":
				pos = this.state.arrow.end[this.props.relPosKey]
				break
			case "arrowStart":
				pos = this.state.arrow.start[this.props.relPosKey]
				break
			default:
		}

		if(target == "pos") {
			this.props.onBlurbUpdate([
					{i: this.props.index, prop: pos, key: target},
					{
						i: this.props.index, 
						prop: this._toRelative(this.state.arrow.start.point, null, pos), 
						key: "arrowStart"
					}
				]);
		}
		else {
			this.props.onBlurbUpdate(this.props.index, pos, target);
		}
		


		e.stopPropagation();
		e.preventDefault();
	},

	_addDragEvents: function() {
		document.addEventListener("mousemove", this._handleMouseMove);
		document.addEventListener("mouseup", this._handleMouseUp);
	},

	_removeDragEvents: function() {
		document.removeEventListener("mousemove", this._handleMouseMove);
		document.removeEventListener("mouseup", this._handleMouseUp);
	},

	_handleToutKeyUp: function(e) {
		var newText = ReactDom.findDOMNode(e.target).textContent
		this._updateText("tout", newText)
	},

	_handleCopyKeyUp: function(e) {

		var newText = ReactDom.findDOMNode(e.target).innerText
		this._updateText("copy", newText)
	},

	_handleArrowDoubleClick: function(d) {
		this.props.onBlurbUpdate(this.props.index, !this.props.arrow.clockwise, "arrowClockwise");
	},

	_handleSpanFocus: function(e) {
		this.setState({
			updatingFromInline: true
		})
	},

	_handleSpanBlur: function(e) {
		this.setState({
			updatingFromInline: false
		})
	},

	_updateText: function(key, newText) {
		this.props.onBlurbUpdate(this.props.index, newText, key);
	},

	_placeArrow: function(){
		var node = ReactDom.findDOMNode(this);
		var endMark = node.querySelector("span.end-mark")

		var nodeBB = node.getBoundingClientRect()
		var endMarkBB = endMark.getBoundingClientRect()
		var parent = node.parentNode;

		var arrow = this.state.arrow;

		// if(this.props.arrow.snapTo == "textEnd") {
		arrow.start = {
			point: {
				x: arrow.start.point.x || 0 ,
				y: arrow.start.point.y || 0
			}
		}

		arrow.start[this.props.relPosKey] = this._toRelative(arrow.start.point, null, this.props.pos)

		// }
		this.setState({
			node: node,
			parent: parent,
			endMarkBB: endMarkBB,
			arrow: arrow
		})

	},

	_fromRelative: function(pos,props,origin) {
		return this.props.fromRelative(pos, this.props, origin)
	},

	_toRelative: function(pos,props,origin) {
		return this.props.toRelative(pos, this.props, origin)
	},

	render: function() {

		var style = {
			position: "absolute",
			left: this.state.dragging ? this.state.pos.x : this.props.pos.x,
			top:  this.state.dragging ? this.state.pos.y : this.props.pos.y
		};

		style = this.props.direct ? null : style;

		var swoopy = swoopyArrow()
		  .angle(Math.PI/3)
		  // .clockwise((this.state.arrow.start.x < this.state.arrow.end.x) ? true : false)
		  .clockwise(this.props.arrow.clockwise)
		  .x(function(d) { return d.x; })
		  .y(function(d) { return d.y; });

		  var arrowPos = {};

		  if(this.state.dragging) {	
		  	arrowPos.start = this.state.arrow.start.point
		  	arrowPos.end = this.state.arrow.end.point
		  }
		  else {
		  	arrowPos.start = this.props.arrow.start.point || 0
		  	arrowPos.end = this.props.arrow.end.point
		  }

		  var editableSpanProps = {
		  	contentEditable: "true",
		  	suppressContentEditableWarning: "true",
		  	onBlur: this._handleSpanBlur,
		  	onFocus: this._handleSpanFocus
		  }

		// this is to prevent crosssite scripting / the insertion of malicous code through annotations
		clean_copy_lines = this.props.copy.trim().split("\n")
		var index = this.props.index
		clean_copy_with_linebreaks = clean_copy_lines.map(function(d,i){
			var linebreak = i != clean_copy_lines.length - 1 ? (<br/>) : null
			return (<span className="blurb_line" key={index + "-blurb_line" + i}>{d}{linebreak}</span>)
		})

		var anchor_points;
		var arrow_svg;

		if(this.props.hasArrow) {
			anchor_points = (
					<div className="anchor_points">
				 		<div className="anchor"></div>
				 		<div className="anchor"></div>
				 		<div className="anchor"></div>
				 		<div className="anchor"></div>
				 		<div className="anchor"></div>
				 		<div className="anchor"></div>
				 		<div className="anchor"></div>
				 		<div className="anchor"></div>
				 		<div className="anchor"></div>
				 	</div>
				 	)

			arrow_svg = (
					<svg>
						<circle
							cx={arrowPos.start.x}
							cy={arrowPos.start.y}
							r="10px"
							onMouseDown={this._handleArrowStartMouseDown}
							onDoubleClick={this._handleArrowDoubleClick}
						/>

						<circle
							cx={arrowPos.end.x}
							cy={arrowPos.end.y}
							r="10px"
							onMouseDown={this._handleArrowEndMouseDown}
							onDoubleClick={this._handleArrowDoubleClick}
						/>
						<path
							markerEnd="url(#arrowhead)"
							d={swoopy([arrowPos.start, arrowPos.end])}
						/>
					</svg>
				)
		}

		return (
			<div
			 className="blurb"
			 style={style}
			 data-mode={this.state.mode}
			>
				<div
					className="interface"
					onMouseDown={this._handleInterfaceMouseDown}
				 >
				 	{anchor_points}
				 </div>

				 <div
				 	className="content"
				 >
				 	<p>
				 		<span className="index">{(this.props.index + 1) + ". "}</span>
				 		<span
				 			{...editableSpanProps}
				 			onKeyUp={this._handleToutKeyUp}
				 		>
				 			{this.props.tout.trim()}
				 		</span>
				 		<span> </span>
				 		<span
				 			{...editableSpanProps}
				 			onKeyUp={this._handleCopyKeyUp}
				 		>
				 			{clean_copy_with_linebreaks}
				 		</span>
				 		<span className="end-mark" />
				 	</p>

				 </div>
				 {arrow_svg}
			</div>
		);
	}

});

module.exports = AnnotationBlurb;