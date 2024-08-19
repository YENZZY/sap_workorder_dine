sap.ui.define([
    'dinewkorder/controller/BaseController',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageBox',
    'sap/m/MessageToast',
	'sap/m/p13n/Engine',
	'sap/m/p13n/SelectionController',
	'sap/m/p13n/SortController',
	'sap/m/p13n/GroupController',
	'sap/m/p13n/MetadataHelper',
	'sap/ui/model/Sorter',
	'sap/ui/core/library',
	'sap/m/table/ColumnWidthController',
	'dinewkorder/js/xlsx',
    'dinewkorder/js/jszip',
	
],
function (Controller, JSONModel, MessageBox, MessageToast, Engine, SelectionController, SortController, GroupController, MetadataHelper, Sorter, CoreLibrary, ColumnWidthController) {
    "use strict";

    return Controller.extend("dinewkorder.controller.Main", {
        onInit: function () {
			this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);

            //this._registerForP13n();
			
        },

		_onRouteMatched: function () {
            this._getData();
        },

        _getData: function () {
			var oMainModel = this.getOwnerComponent().getModel();
            // commonModelData 함수를 this와 바인딩하여 정의

            var commonModelData = function(url, modelName) {
				 // 함수 호출 시 this가 올바르게 참조되도록 수정
                this._getODataRead(oMainModel, url).then(function(commonData) {
                    var oModel = new JSONModel(commonData);
                    this.setModel(oModel, modelName);

					if (modelName === "dataModel") {
						var dataModel = this.getModel("dataModel").getData();
						var mfgOrderModel = this.getModel("mfgOrderModel").getData();
						var soModel = this.getModel("soModel").getData();
						var productModel = this.getModel("productModel").getData();

						// 데이터 모델의 ManufacturingOrderType과 일치하는 mfgOrderModel의 항목을 찾기 
						// dataModel에 ManufacturingOrderTypeName을 추가
						dataModel.forEach(function(dataItem) {
							// 오더 유형 내역
							var matchingOrder = mfgOrderModel.find(function(mfgOrderItem) {
								return mfgOrderItem.ManufacturingOrderType === dataItem.ManufacturingOrderType;
							});
							
							if (matchingOrder) {
								dataItem.ManufacturingOrderTypeName = matchingOrder.ManufacturingOrderTypeName;
							}

							// 제품
							var matchingMaterial = soModel.find(function(soItem) {
								return soItem.SalesOrder === dataItem.SalesOrder && soItem.SalesOrderItem === dataItem.SalesOrderItem;
							});

							if(matchingMaterial) {
								dataItem.Material = matchingMaterial.Material;
							}

							//제품 내역 및 단위
							var matchingProduct = productModel.find(function(prodItem){
								return prodItem.Product === dataItem.Material;
							});

							if(matchingProduct) {
								dataItem.ProductDescription = matchingProduct.ProductDescription;
								dataItem.BaseUnit = matchingProduct.BaseUnit;
							}
						});
		
						// 변경된 dataModel을 모델에 다시 설정
						var updatedModel = new JSONModel(dataModel);
						this.setModel(updatedModel, "dataModel");
					}
                }.bind(this));
            }.bind(this); // commonModelData 함수 자체에 this를 바인딩

			commonModelData("/MfgOrder", "mfgOrderModel");
			commonModelData("/SalesOrder", "soModel");
			commonModelData("/Product", "productModel");
			commonModelData("/ProductionVersion", "prodVerModel");
			commonModelData("/Plant", "plantModel");
            commonModelData("/ProdLvl", "prodLvlModel");
            commonModelData("/SchedPri", "schedPriModel");
			commonModelData("/ProdOrder", "dataModel");
		},
		
		// 단일 생성(수주) 페이지 이동
		onPageSO: function () {
			this.navTo("PageSO",{});
		},

		// 단일 생성(양산) 페이지 이동
		onPageMP: function () {
			this.navTo("PageMP",{});
		},

		// 상세 페이지 이동
		onMove: function (oEvent) {
			if(oEvent.getSource().getParent().getBindingContext("dataModel").getObject().MfgOrderType === '수주'){
				var oRowData = oEvent.getSource().getParent().getBindingContext("dataModel").getObject().Uuid
				this.navTo("PageSO", { 
					//Uuid: oRowData
				});
			} else { // 양산
				var oRowData = oEvent.getSource().getParent().getBindingContext("dataModel").getObject().Uuid
				this.navTo("PageMP", { 
					//Uuid: oRowData
				});
			}
		},

		onUpload: function (oEvent) {
			var file = oEvent.getParameter("files")[0]; // 선택된 파일 가져오기
			var oMainModel = this.getOwnerComponent().getModel();
		
			if (file && window.FileReader) {
				var reader = new FileReader();
		
				// 파일 읽기 성공 시
				reader.onload = function (e) {
					var data = e.target.result;
					var workbook = XLSX.read(data, { type: 'binary' });
					var saveProdOrder = [];
		
					workbook.SheetNames.forEach(function (sheetName) {
						var excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
						console.log("Excel Data:", excelData);
		
						var filteredData = excelData.map(function (row) {
							return {
								ProductionPlant: row["플랜트"] || row["ProductionPlant"],
								SalesOrder: row["판매문서"] || row["SalesOrder"],
								SalesOrderItem: row["판매문서 품목"] || row["SalesOrderItem"],
								Material: row["제품코드"] || row["Material"],
								ManufacturingOrderType: row["오더유형"] || row["ManufacturingOrderType"],
								ProductionVersion: row["생산버전"] || row["ProductionVersion"],
								TotalQuantity: row["작업지시 수량"] || row["TotalQuantity"],
								MfgOrderPlannedStartDate: row["기본시작일"] || row["MfgOrderPlannedStartDate"],
								LotSize: row["로트 사이즈"] || row["LotSize"],
								YY1_PROD_RANK_ORD: row["생산순위"] || row["YY1_PROD_RANK_ORD"],
								YY1_PRIO_RANK_ORD: row["우선순위"] || row["YY1_PRIO_RANK_ORD"],
								YY1_PROD_TEXT_ORD: row["생산주석"] || row["YY1_PROD_TEXT_ORD"]
							};
						});
		
						saveProdOrder = saveProdOrder.concat(filteredData.flatMap(function (saveData) {
							var orders = [];
							var lotSize = saveData.LotSize ? parseFloat(saveData.LotSize) : 0;
							var totalQuantity = parseFloat(saveData.TotalQuantity);
		
							if (lotSize > 0 && totalQuantity > lotSize) {
								// 로트 사이즈를 사용하여 여러 개의 작업 지시 생성
								for (var i = 0; i < Math.floor(totalQuantity / lotSize); i++) {
									orders.push({
										MfgOrderType: (saveData.SalesOrder === "" || saveData.SalesOrderItem === "" ? "2" : "1"),
										ProductionPlant: saveData.ProductionPlant.toString(),
										SalesOrder: saveData.SalesOrder.toString(),
										SalesOrderItem: saveData.SalesOrderItem.toString(),
										Material: saveData.Material.toString(),
										ManufacturingOrderType: saveData.ManufacturingOrderType.toString(),
										ProductionVersion: saveData.ProductionVersion.toString(),
										MfgOrderPlannedTotalQty: lotSize.toString(),
										// MfgOrderPlannedStartDate: saveData.MfgOrderPlannedStartDate,
										Yy1ProdRankOrd: saveData.YY1_PROD_RANK_ORD.toString(),
										Yy1PrioRankOrd: saveData.YY1_PRIO_RANK_ORD.toString(),
										Yy1ProdText: saveData.YY1_PROD_TEXT_ORD.toString()
									});
								}
		
								// 나머지 수량을 처리하기 위한 주문 추가
								var remainder = totalQuantity % lotSize;
								if (remainder > 0) {
									orders.push({
										MfgOrderType: (saveData.SalesOrder === "" || saveData.SalesOrderItem === "" ? "2" : "1"),
										ProductionPlant: saveData.ProductionPlant.toString(),
										SalesOrder: saveData.SalesOrder.toString(),
										SalesOrderItem: saveData.SalesOrderItem.toString(),
										Material: saveData.Material.toString(),
										ManufacturingOrderType: saveData.ManufacturingOrderType.toString(),
										ProductionVersion: saveData.ProductionVersion.toString(),
										MfgOrderPlannedTotalQty: remainder.toString(),
										// MfgOrderPlannedStartDate: saveData.MfgOrderPlannedStartDate,
										Yy1ProdRankOrd: saveData.YY1_PROD_RANK_ORD.toString(),
										Yy1PrioRankOrd: saveData.YY1_PRIO_RANK_ORD.toString(),
										Yy1ProdText: saveData.YY1_PROD_TEXT_ORD.toString()
									});
								}
							} else {
								// 로트 사이즈가 없거나 전체 수량이 로트 사이즈보다 작을 때
								orders.push({
									MfgOrderType: (saveData.SalesOrder === "" || saveData.SalesOrderItem === "" ? "2" : "1"),
									ProductionPlant: saveData.ProductionPlant.toString(),
									SalesOrder: saveData.SalesOrder.toString(),
									SalesOrderItem: saveData.SalesOrderItem.toString(),
									Material: saveData.Material.toString(),
									ManufacturingOrderType: saveData.ManufacturingOrderType.toString(),
									ProductionVersion: saveData.ProductionVersion.toString(),
									MfgOrderPlannedTotalQty: totalQuantity.toString(),
									// MfgOrderPlannedStartDate: saveData.MfgOrderPlannedStartDate,
									Yy1ProdRankOrd: saveData.YY1_PROD_RANK_ORD.toString(),
									Yy1PrioRankOrd: saveData.YY1_PRIO_RANK_ORD.toString(),
									Yy1ProdText: saveData.YY1_PROD_TEXT_ORD.toString()
								});
							}
		
							return orders;
						}));
					});
		
					console.log("SaveProdOrder:", saveProdOrder);
		
					// 데이터 저장 요청
					this._getODataCreate(oMainModel, "/ProdOrder", saveProdOrder).done(function () {
						MessageBox.success("성공");
					}).fail(function (error) {
						MessageBox.error("서버에 데이터를 저장하는 도중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
					});
				}.bind(this);
		
				// 파일 읽기 오류 시
				reader.onerror = function (e) {
					MessageBox.error("파일을 읽는 도중 오류가 발생했습니다.");
				}
		
				// 파일 읽기 시작
				reader.readAsBinaryString(file); // 바이너리 문자열로 읽기
			} else {
				MessageBox.error("FileReader를 지원하지 않거나 파일이 선택되지 않았습니다.");
			}
		},		
		
        // standard table vm (start)
        _registerForP13n: function() {
			const oTable = this.byId("dataTable");

			this.oMetadataHelper = new MetadataHelper([{
					key: "status_col",
					label: "상태",
					path: "dataModel>Status"
				},
				{
					key: "mfgOrderType_col",
					label: "생산 오더 유형",
					path: "dataModel>MfgOrderType"
				},
				{
					key: "manufacturingOrder_col",
					label: "생산 오더",
					path: "dataModel>ManufacturingOrder"
				},
				{
					key: "salesOrder_col",
					label: "판매 문서",
					path: "dataModel>SalesOrder"
				},
				{
					key: "manufacturingOrderType_col",
					label: "오더 유형",
					path: "dataModel>ManufacturingOrderType"
				},
                {
					key: "manufacturingOrderTypeName_col",
					label: "오더 유형 내역",
					path: "dataModel>ManufacturingOrderTypeName"
				},
                {
					key: "material_col",
					label: "제품",
					path: "dataModel>Material"
				},
                {
					key: "productDescription_col",
					label: "제품 내역",
					path: "dataModel>ProductDescription"
				},
                {
					key: "mfgOrderPlannedStartDate_col",
					label: "기본 시작일",
					path: "dataModel>MfgOrderPlannedStartDate",
					type: 'sap.ui.model.type.Date',
					formatOptions: { pattern: 'yyyy-MM-dd' }
				},
                {
					key: "mfgOrderPlannedTotalQty_col",
					label: "지시 수량",
					path: "dataModel>MfgOrderPlannedTotalQty",
					type: 'sap.ui.model.type.Float',
					formatOptions: { maximumFractionDigits: 0 , minimumFractionDigits: 0 }
				},
                {
					key: "baseUnit_col",
					label: "단위",
					path: "dataModel>BaseUnit"
				},
                {
					key: "productionVersion_col",
					label: "생산 버전",
					path: "dataModel>ProductionVersion"
				},
                {
					key: "yy1ProdRankOrd_col",
					label: "생산 순위",
					path: "dataModel>Yy1ProdRankOrd"
				},
                {
					key: "yy1PrioRankOrd_col",
					label: "우선 순위",
					path: "dataModel>Yy1PrioRankOrd"
				},
                {
					key: "yy1ProdText_col",
					label: "생산 주석",
					path: "dataModel>Yy1ProdText"
				},
				{
					key: "message_col",
					label: "메시지",
					path: "dataModel>Message"
				}
			]);

			// this._mIntialWidth = {
			// 	"firstName_col": "11rem",
			// 	"lastName_col": "11rem",
			// 	"city_col": "11rem",
			// 	"size_col": "11rem"
			// };

			Engine.getInstance().register(oTable, {
				helper: this.oMetadataHelper,
				controller: {
					Columns: new SelectionController({
						targetAggregation: "columns",
						control: oTable
					}),
					Sorter: new SortController({
						control: oTable
					}),
					Groups: new GroupController({
						control: oTable
					}),
					ColumnWidth: new ColumnWidthController({
						control: oTable
					})
				}
			});

			Engine.getInstance().attachStateChange(this.handleStateChange.bind(this));
		},

		openPersoDialog: function(oEvt) {
			const oTable = this.byId("dataTable");

			Engine.getInstance().show(oTable, ["Columns", "Sorter"], {
				contentHeight: "35rem",
				contentWidth: "32rem",
				source: oEvt.getSource()
			});
		},

		onColumnHeaderItemPress: function(oEvt) {
			const oTable = this.byId("dataTable");
			const sPanel = oEvt.getSource().getIcon().indexOf("sort") >= 0 ? "Sorter" : "Columns";

			Engine.getInstance().show(oTable, [sPanel], {
				contentHeight: "35rem",
				contentWidth: "32rem",
				source: oTable
			});
		},

		onSort: function(oEvt) {
			const oTable = this.byId("dataTable");
			const sAffectedProperty = this._getKey(oEvt.getParameter("column"));
			const sSortOrder = oEvt.getParameter("sortOrder");

			//Apply the state programatically on sorting through the column menu
			//1) Retrieve the current personalization state
			Engine.getInstance().retrieveState(oTable).then(function(oState) {

				//2) Modify the existing personalization state --> clear all sorters before
				oState.Sorter.forEach(function(oSorter) {
					oSorter.sorted = false;
				});
				oState.Sorter.push({
					key: sAffectedProperty,
					descending: sSortOrder === CoreLibrary.SortOrder.Descending
				});

				//3) Apply the modified personalization state to persist it in the VariantManagement
				Engine.getInstance().applyState(oTable, oState);
			});
		},

		onColumnMove: function(oEvt) {
			debugger;
			const oTable = this.byId("dataTable");
			const oAffectedColumn = oEvt.getParameter("column");
			const iNewPos = oEvt.getParameter("newPos");
			const sKey = this._getKey(oAffectedColumn);
			oEvt.preventDefault();

			Engine.getInstance().retrieveState(oTable).then(function(oState) {

				const oCol = oState.Columns.find(function(oColumn) {
					return oColumn.key === sKey;
				}) || {
					key: sKey
				};
				oCol.position = iNewPos;

				Engine.getInstance().applyState(oTable, {
					Columns: [oCol]
				});
			});
		},

		_getKey: function(oControl) {
			return this.getView().getLocalId(oControl.getId());
		},

		handleStateChange: function(oEvt) {
			const oTable = this.byId("dataTable");
			const oState = oEvt.getParameter("state");

			if (!oState) {
				return;
			}

			oTable.getColumns().forEach(function(oColumn) {

				// const sKey = this._getKey(oColumn);
				// const sColumnWidth = oState.ColumnWidth[sKey];

				// oColumn.setWidth(sColumnWidth || this._mIntialWidth[sKey]);

				oColumn.setVisible(false);
				oColumn.setSortOrder(CoreLibrary.SortOrder.None);
			}.bind(this));

			oState.Columns.forEach(function(oProp, iIndex) {
				const oCol = this.byId(oProp.key);
				oCol.setVisible(true);

				oTable.removeColumn(oCol);
				oTable.insertColumn(oCol, iIndex);
			}.bind(this));

			const aSorter = [];
			oState.Sorter.forEach(function(oSorter) {
				const oColumn = this.byId(oSorter.key);
				/** @deprecated As of version 1.120 */
				oColumn.setSorted(true);
				oColumn.setSortOrder(oSorter.descending ? CoreLibrary.SortOrder.Descending : CoreLibrary.SortOrder.Ascending);
				aSorter.push(new Sorter(this.oMetadataHelper.getProperty(oSorter.key).path, oSorter.descending));
			}.bind(this));
			oTable.getBinding("rows").sort(aSorter);
		},

		onColumnResize: function(oEvt) {
			const oColumn = oEvt.getParameter("column");
			const sWidth = oEvt.getParameter("width");
			const oTable = this.byId("dataTable");

			const oColumnState = {};
			oColumnState[this._getKey(oColumn)] = sWidth;

			Engine.getInstance().applyState(oTable, {
				ColumnWidth: oColumnState
			});
		}
    });
});
