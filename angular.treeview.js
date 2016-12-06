/*
	@license Angular Treeview version 0.1.6
	ⓒ 2013 AHN JAE-HA http://github.com/eu81273/angular.treeview
	License: MIT


	[TREE attribute]
	angular-treeview: the treeview directive
	tree-id : each tree's unique id.
	tree-model : the tree model on $scope.
	node-id : each node's id
	node-label : each node's label
	node-children: each node's children

	<div
		data-angular-treeview="true"
		data-tree-id="tree"
		data-tree-model="roleList"
		data-node-id="roleId"
		data-node-label="roleName"
		data-node-children="children" >
	</div>
*/

(function ( angular ) {
	'use strict';

	var m = angular.module( 'angularTreeview', [] );

	m.service( 'treeModelUtils', [function() {
		var service = {

			/**
			 * Constructs id-value map from tree-like structure with "children" property.
			 * It does not deep copy the nodes. It does not copy them at all.
			 * It places the original node objects to the result map.
			 *
			 * @param initialNodeList The tree-like structure.
			 * @param idField The name of id property on each node.
			 * @param result The reference to the object, that will be filled with values.
			 */
			saveToMap: function(initialNodeList, idField, result) {
				initialNodeList.forEach(function (item) {
					if (item[idField]) {
						result[item[idField]] = item;
						if (item.children && item.children.length > 0) {
							service.saveToMap(item.children, idField, result);
						}
					} else {
						console.log('No id.');
					}
				});
			},

			/**
			 * It constructs the list with the original node objects, that was not modified by the widget.
			 * Currently it does not return the subnodes of the selected nodes.
			 *
			 * @param initialItemsMap The map with all nodes, where the key is the node id.
			 * @param widgetModel Contains the copies of the nodes.
			 * @param idField The name of id property on each node.
			 * @param result The list of the selected nodes (except for its subnodes).
			 */
			selectedAsList: function(initialItemsMap, widgetModel, idField, result) {
				widgetModel.forEach(function (possiblyChecked) {
					if (possiblyChecked[idField] && possiblyChecked.nodeState && possiblyChecked.nodeState.isChecked) {
						var theSameItemInInitialState = initialItemsMap[possiblyChecked[idField]];
						if (theSameItemInInitialState && result.indexOf(theSameItemInInitialState) < 0) {
							result.push(theSameItemInInitialState);
						}
					} else if (possiblyChecked.children && possiblyChecked.children.length > 0) {
						service.selectedAsList(initialItemsMap, possiblyChecked.children, idField, result);
					}
				});
			},

			/**
			 * When you copy the tree, that the widget will use,
			 * you may want to make some checkboxes checked.
			 * The method ignores the state of subnodes of the checked nodes.
			 *
			 * @param widgetModel
			 * @param selectedIds The ids of the nodes you want to make checked.
			 * @param idField The name of id property on each node.
			 */
			checkSelected: function(widgetModel, selectedIds, idField) {
				widgetModel.forEach(function (item) {
					item.nodeState = {
						__id: 'cs_' + Math.ceil(Math.random()*100000) // For debugging purposes.
					};
					item.nodeState.isChecked = (selectedIds.indexOf(item[idField]) >= 0);
					if (!item.nodeState.isChecked && item.children && item.children.length > 0) {
						service.checkSelected(item.children, selectedIds, idField);
					}
				});
			}
		};
		return service;
	}]);

	m.directive( 'treeModel', ['$compile', function( $compile ) {
		return {
			restrict: 'A',
			scope: {
				treeModel: '=',
				depth: '=?'
			},
			link: function ( scope, element, attrs ) {
				//tree id
				var treeId = attrs.treeId;

				//tree model
				scope.tree = scope.treeModel;

				function initializeStates(treeModelObject) {
					if (treeModelObject) {
						treeModelObject.forEach(function (item) {

							// Скорее всего, я уже предзаполню эти штуки извне.
							// Но на случай, если нет, нужно заранее создать эти объекты.
							if (!item.nodeState) {
								item.nodeState = {
									__id: '_' + Math.ceil(Math.random()*100000) // For debugging purposes.
								};
							}
						});
					}
				}

				//node id
				var nodeId = attrs.nodeId || 'id';

				//node label
				var nodeLabel = attrs.nodeLabel || 'label';

				//children
				var nodeChildren = attrs.nodeChildren || 'children';

				var depth = parseInt(scope.depth || 2);
				var parentScope2 = scope;
				for (var i = 1; i <= depth; i++) {
					parentScope2 = parentScope2.$parent;
				}
				var parentScope = parentScope2;

				var useCheckboxes = ('' + true) === ('' + attrs.useCheckboxes);

				if (useCheckboxes) {
					initializeStates(scope.tree);
				}

				scope.hasCheckedParent = function (node) {
					var iteratedNode = node;
					while (iteratedNode.parent) {
						if (iteratedNode.parent.nodeState && iteratedNode.parent.nodeState.isChecked) {
							return true;
						}
						iteratedNode = iteratedNode.parent;
					}
					return false;
				};

				//tree template
				var template =
					'<ul>' +
						'<li data-ng-repeat="node in tree">' +
							'<i class="collapsed" data-ng-show="node.' + nodeChildren + '.length && node.collapsed" data-ng-click="' + treeId + '.selectNodeHead(node)"></i>' +
							'<i class="expanded" data-ng-show="node.' + nodeChildren + '.length && !node.collapsed" data-ng-click="' + treeId + '.selectNodeHead(node)"></i>' +
							'<i class="normal" data-ng-hide="node.' + nodeChildren + '.length"></i> ' +
							(useCheckboxes ? '<input type="checkbox" data-ng-model="node.nodeState.isChecked" data-ng-disabled="node.disabled" ng-if="!hasCheckedParent(node)"/>' : '') +
							(useCheckboxes ? '<input type="checkbox" checked="checked" disabled="disabled" ng-if="hasCheckedParent(node)"/>' : '') +
							(useCheckboxes ? '&nbsp;' : '') +

							'<span data-ng-class="node.selected" data-ng-click="' + treeId + '.selectNodeLabel(node)">{{node.' + nodeLabel + '}}</span>' +
							'<div data-ng-hide="node.collapsed" ' +
									'data-use-checkboxes="'+ useCheckboxes +'" ' +
									'data-depth="' + (depth + 1) + '" ' +
									'data-tree-id="' + treeId + '" ' +
									'data-tree-model="node.' + nodeChildren + '" ' +
									'ng-if="node.' + nodeChildren + '" ' +
									'data-node-id=' + nodeId + ' ' +
									'data-node-label=' + nodeLabel + ' ' +
									'data-node-children=' + nodeChildren + '></div>' +
						'</li>' +
					'</ul>';


				//check tree id, tree model
				if( treeId && scope.treeModel ) {

					//root node
					if( attrs.angularTreeview ) {

						//create tree object if not exists
						parentScope[treeId] = parentScope[treeId] || {};

						//if node head clicks,
						parentScope[treeId].selectNodeHead = parentScope[treeId].selectNodeHead || function( selectedNode ){

							//Collapse or Expand
							selectedNode.collapsed = !selectedNode.collapsed;
						};

						//if node label clicks,
						parentScope[treeId].selectNodeLabel = parentScope[treeId].selectNodeLabel || function( selectedNode ){

							if (!useCheckboxes) {
								//remove highlight from previous node
								if( parentScope[treeId].currentNode && parentScope[treeId].currentNode.selected ) {
									parentScope[treeId].currentNode.selected = undefined;
								}

								//set highlight to selected node
								selectedNode.selected = 'selected';

								//set currentNode
								parentScope[treeId].currentNode = selectedNode;
							}

						};
					}

					scope[treeId].selectNodeHead = function (selectedNode) {
						parentScope[treeId].selectNodeHead(selectedNode);
					};
					scope[treeId].selectNodeLabel = function (selectedNode) {
						parentScope[treeId].selectNodeLabel(selectedNode);
					};

					//Rendering template.
					element.html('').append( $compile( template )( scope ) );
				}
			}
		};
	}]);
})( angular );
