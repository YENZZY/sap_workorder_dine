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

            this._registerForP13n();

		
        },

		_onRouteMatched: function () {
            this._getData();
        },

		_getData: function () {
			var oMainModel = this.getOwnerComponent().getModel("dineData"); // cus
			var oDineModel = this.getOwnerComponent().getModel("mainData"); //dev
		
			// fetchModel 함수를 수정하여 Promise를 반환하도록 변경
			var fetchModel = function(url, modelName, isDineModel) {
				var model = isDineModel ? oDineModel : oMainModel;
				return this._getODataRead(model, url).then(function(data) {
					var oModel = new JSONModel(data);
					this.setModel(oModel, modelName);
				}.bind(this)).catch(function(error) {
					console.error("데이터를 가져오는 데 실패했습니다:", url, error);
				});
			}.bind(this);
		
			// fetchModel 호출의 결과로 Promise 배열 생성
			var fetchPromises = [
				fetchModel("/MfgOrder", "mfgOrderModel"),
				fetchModel("/SalesOrder", "soModel"),
				fetchModel("/Product", "productModel"),
				fetchModel("/ProductionVersion", "prodVerModel"),
				fetchModel("/Plant", "plantModel"),
				fetchModel("/ProdLvl", "prodLvlModel", true),
				fetchModel("/SchedPri", "schedPriModel", true),
				fetchModel("/ProdOrder", "dataModel", true)
			];
		
			// 모든 fetch 작업이 완료될 때까지 기다림
			Promise.all(fetchPromises).then(function() {
				// 모든 모델이 이제 가져오고 설정됨
				var dataModel = this.getModel("dataModel");
				var mfgOrderModel = this.getModel("mfgOrderModel");
				var soModel = this.getModel("soModel");
				var productModel = this.getModel("productModel");
		
				if (dataModel && mfgOrderModel && soModel && productModel) {
					var data = dataModel.getData();
					var mfgOrders = mfgOrderModel.getData();
					var salesOrders = soModel.getData();
					var products = productModel.getData();
		
					// 다른 모델을 기반으로 dataModel 업데이트
					data.forEach(function(dataItem) {
						// ManufacturingOrderType과 일치하는 항목 찾기
						var matchingOrder = mfgOrders.find(function(order) {
							return order.ManufacturingOrderType === dataItem.ManufacturingOrderType;
						});
		
						if (matchingOrder) {
							dataItem.ManufacturingOrderTypeName = matchingOrder.ManufacturingOrderTypeName;
						}
		
						// SalesOrder와 SalesOrderItem이 일치하는 항목 찾기
						var matchingMaterial = salesOrders.find(function(salesOrder) {
							return salesOrder.SalesOrder === dataItem.SalesOrder && salesOrder.SalesOrderItem === dataItem.SalesOrderItem;
						});
		
						if (matchingMaterial) {
							dataItem.Material = matchingMaterial.Material;
						}
		
						// Material과 일치하는 Product 항목 찾기
						var matchingProduct = products.find(function(product) {
							return product.Product === dataItem.Material;
						});
		
						if (matchingProduct) {
							dataItem.ProductDescription = matchingProduct.ProductDescription;
							dataItem.BaseUnit = matchingProduct.BaseUnit;
						}
					});
		
					// 업데이트된 dataModel 설정
					var updatedModel = new JSONModel(data);
					this.setModel(updatedModel, "dataModel");
				}
			}.bind(this)).catch(function(error) {
				console.error("모델 처리 중 오류 발생:", error);
			});
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
			if (file && window.FileReader) {
				var reader = new FileReader();
		
				// 파일 읽기 성공 시
				reader.onload = function (e) {
					var data = e.target.result;
					var workbook = XLSX.read(data, { type: 'binary' });
					var saveProdOrder = [];

					// 엑셀 날짜를 JavaScript Date로 변환하는 함수
					function excelDateToJSDate(excelDate) {
						// 엑셀 날짜 시스템 기준 날짜 (1900년 1월 1일)
						var excelBaseDate = new Date(Date.UTC(1900, 0, 0));
						// 엑셀 날짜는 1일이 1로 표시됨 (86400000 ms = 1일)
						var jsDate = new Date(excelBaseDate.getTime() + (excelDate - 1) * 86400000);
						console.log(jsDate);
						return jsDate;
					}

					// JavaScript Date를 YYYY-MM-DD 형식의 문자열로 변환하는 함수
					// function formatJSDate(jsDate) {
					// 	var year = jsDate.getFullYear();
					// 	var month = ('0' + (jsDate.getMonth() + 1)).slice(-2); // 월은 0부터 시작하므로 +1
					// 	var day = ('0' + jsDate.getDate()).slice(-2);

					// 	return `${year}-${month}-${day}`;
					// }

					// JavaScript Date를 YYYYMMDD 형식의 문자열로 변환하는 함수
					// function formatDateToDATS(jsDate) {
					// 	var year = jsDate.getFullYear();
					// 	var month = ('0' + (jsDate.getMonth() + 1)).slice(-2);
					// 	var day = ('0' + jsDate.getDate()).slice(-2);

					// 	return `${year}${month}${day}`;
					// }
					
					workbook.SheetNames.forEach(function (sheetName) {
						var excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
						console.log("Excel Data:", excelData);
		
						var filteredData = excelData.map(function (row) {
							var date = row["기본 시작일"] || row["MfgOrderPlannedStartDate"];
							var dates = excelDateToJSDate(parseFloat(date));
							
							console.log("row", row);
							console.log("기본 시작일 값:", dates);
							return {
								ProductionPlant: row["플랜트"] || row["ProductionPlant"],
								SalesOrder: row["판매문서"] || row["SalesOrder"],
								SalesOrderItem: row["판매문서 품목"] || row["SalesOrderItem"],
								Material: row["제품코드"] || row["Material"],
								ManufacturingOrderType: row["오더유형"] || row["ManufacturingOrderType"],
								ProductionVersion: row["생산버전"] || row["ProductionVersion"],
								TotalQuantity: row["작업지시 수량"] || row["TotalQuantity"],
								MfgOrderPlannedStartDate: dates,
								LotSize: row["로트 사이즈"] || row["LotSize"],
								YY1_PROD_RANK_ORD: row["생산순위"] || row["YY1_PROD_RANK_ORD"],
								YY1_PRIO_RANK_ORD: row["우선순위"] || row["YY1_PRIO_RANK_ORD"],
								YY1_PROD_TEXT_ORD: row["생산주석"] || row["YY1_PROD_TEXT_ORD"]
							};
						});
		
						saveProdOrder = saveProdOrder.concat(filteredData.flatMap(function (saveData) {
							var orders = [];
							var lotSize = saveData.LotSize ? parseFloat(saveData.LotSize) : parseFloat(saveData.TotalQuantity);
							console.log("ls",lotSize);
							var totalQuantity = parseFloat(saveData.TotalQuantity);
							console.log("total",totalQuantity);
							 // 값을 문자열로 변환하는 함수
							 function convertValuesToString(obj) {
								return Object.fromEntries(
									Object.entries(obj).map(([key, value]) => [key, value && key !== 'MfgOrderPlannedStartDate' ? value.toString() : value])
								);
							}

							if (lotSize > 0 && totalQuantity > lotSize) {
								// 로트 사이즈를 사용하여 여러 개의 작업 지시 생성
								for (var i = 0; i < Math.floor(totalQuantity / lotSize); i++) {
									orders.push(convertValuesToString({
										MfgOrderType: (!saveData.SalesOrder || !saveData.SalesOrderItem ? "2" : "1"),
										ProductionPlant: saveData.ProductionPlant,
										SalesOrder: saveData.SalesOrder,
										SalesOrderItem: saveData.SalesOrderItem,
										Material: saveData.Material,
										ManufacturingOrderType: saveData.ManufacturingOrderType,
										ProductionVersion: saveData.ProductionVersion,
										MfgOrderPlannedTotalQty: lotSize,
										MfgOrderPlannedStartDate: saveData.MfgOrderPlannedStartDate, // 날짜 변환
										Yy1ProdRankOrd: saveData.YY1_PROD_RANK_ORD,
										Yy1PrioRankOrd: saveData.YY1_PRIO_RANK_ORD,
										Yy1ProdText: saveData.YY1_PROD_TEXT_ORD
									}));
								}
		
								// 나머지 수량을 처리하기 위한 주문 추가
								var remainder = totalQuantity % lotSize;
								console.log("remainder",remainder);
								if (remainder > 0) {
									orders.push(convertValuesToString({
										MfgOrderType: (!saveData.SalesOrder || !saveData.SalesOrderItem ? "2" : "1"),
										ProductionPlant: saveData.ProductionPlant,
										SalesOrder: saveData.SalesOrder,
										SalesOrderItem: saveData.SalesOrderItem,
										Material: saveData.Material,
										ManufacturingOrderType: saveData.ManufacturingOrderType,
										ProductionVersion: saveData.ProductionVersion,
										MfgOrderPlannedTotalQty: remainder,
										MfgOrderPlannedStartDate: saveData.MfgOrderPlannedStartDate,
										Yy1ProdRankOrd: saveData.YY1_PROD_RANK_ORD,
										Yy1PrioRankOrd: saveData.YY1_PRIO_RANK_ORD,
										Yy1ProdText: saveData.YY1_PROD_TEXT_ORD
									}));
								}
							} else {
								// 로트 사이즈가 없거나 전체 수량이 로트 사이즈보다 작을 때
								orders.push(convertValuesToString({
									MfgOrderType: (!saveData.SalesOrder || !saveData.SalesOrderItem ? "2" : "1"),
									ProductionPlant: saveData.ProductionPlant,
									SalesOrder: saveData.SalesOrder,
									SalesOrderItem: saveData.SalesOrderItem,
									Material: saveData.Material,
									ManufacturingOrderType: saveData.ManufacturingOrderType,
									ProductionVersion: saveData.ProductionVersion,
									MfgOrderPlannedTotalQty: totalQuantity,
									MfgOrderPlannedStartDate: saveData.MfgOrderPlannedStartDate,
									Yy1ProdRankOrd: saveData.YY1_PROD_RANK_ORD,
									Yy1PrioRankOrd: saveData.YY1_PRIO_RANK_ORD,
									Yy1ProdText: saveData.YY1_PROD_TEXT_ORD
								}));
							}
		
							return orders;
						}));
					});
					
					console.log("SaveProdOrder:", saveProdOrder);
					this.saveProdOrder = saveProdOrder;
					// 날짜 포맷 함수 (시간을 T00:00:00으로 설정)
					function toDateFormat(dateString) {
						// Date 객체를 생성
						var date = new Date(dateString);

						// 날짜와 시간을 형식화
						var formattedDate = [
							date.getFullYear(),
							('0' + (date.getMonth() + 1)).slice(-2), // 월은 0부터 시작
							('0' + date.getDate()).slice(-2)
						].join('-');

						var formattedTime = [
							('0' + date.getHours()).slice(-2),
							('0' + date.getMinutes()).slice(-2),
							('0' + date.getSeconds()).slice(-2)
						].join(':');

						return formattedDate + 'T' + formattedTime;
					}
					
					var postArray = saveProdOrder.map(function(data){
						return {

							ManufacturingOrderType: data.ManufacturingOrderType || "",
							Material: data.Material || "",
							MfgOrderPlannedStartDate: toDateFormat(data.MfgOrderPlannedStartDate) || "",
							ProductionVersion: data.ProductionVersion || "",
							SalesOrder: data.SalesOrder || "",
							SalesOrderItem: data.SalesOrderItem || "",
							ProductionPlant: data.ProductionPlant || "",
							TotalQuantity: parseFloat(data.MfgOrderPlannedTotalQty || "").toFixed(3),
							YY1_PROD_RANK_ORD: data.Yy1ProdRankOrd || "",
							YY1_PRIO_RANK_ORD: data.Yy1PrioRankOrd || "",
							YY1_PROD_TEXT_ORD: data.Yy1ProdText || ""
		
							// SalesOrder : "5",
							// SalesOrderItem : "0010",
							// Material : "FG228",
							// ProductionPlant : "4310",
							// ManufacturingOrderType : "DN01",
							// ProductionVersion : "0001",
							// TotalQuantity : "1",
							// MfgOrderPlannedStartDate : "2024-01-20T00:00:00",
							// YY1_PROD_RANK_ORD : "101",
							// YY1_PRIO_RANK_ORD : "000000000000000014",
							// YY1_PROD_TEXT_ORD : "납기준수"
						};
					});

					console.log("postArray", postArray); 

            this.csrfToken = "";

            // CSRF 토큰을 가져오는 함수 호출
            this.getCSRFToken().then(function(token) {
                this.csrfToken = token; // CSRF 토큰 저장
                console.log("token", this.csrfToken);
                
                // POST 요청을 보내는 함수 호출
                var postPromises = postArray.map(function(data,index) {  
                
                    return this.postProductionOrder(data,index); // 각 요청에 대한 Promise 반환
                }.bind(this)); // `this` 바인딩
        
                // 모든 POST 요청이 완료될 때까지 대기
                Promise.all(postPromises).then(function() {
					console.log("모든 POST 요청 완료");
					MessageBox.success("작업 지시 생성이 완료되었습니다.");
					
				}.bind(this)).catch(function(err) {
					console.error("POST 요청 중 오류 발생:", err);
					MessageBox.error("작업 지시 생성 중 오류가 발생했습니다.")
				}.bind(this));
				}.bind(this)).catch(function(err) {
					console.error("CSRF 토큰 요청 중 오류 발생:", err);});
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
        
		postProductionOrder: function(data,index) {
			console.log("data", data,index);
			
			// `$.ajax`를 `Promise`로 래핑
			return new Promise(function(resolve, reject) {
				$.ajax({
					url: "/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2",
					type: "POST",
					data: JSON.stringify(data),
					dataType: "json",
					contentType: "application/json",
					async:"false",
					headers: {
						"X-CSRF-Token": this.csrfToken
					},
					success: function(response) {
						try {
							this.handleSuccess(response,index); // `this`를 바인딩하여 콜백 함수에 전달
							resolve(); // 성공 시 Promise 해결
						} catch (error) {
							reject(error); // `handleSuccess`에서 오류가 발생한 경우
						}
					}.bind(this), // `this` 바인딩
					error: function(xhr) {
						try {
							this.handleError(xhr, data, index); // `this`를 바인딩하여 콜백 함수에 전달
							reject(xhr); // 실패 시 Promise 거부
						} catch (error) {
							reject(error); // `handleError`에서 오류가 발생한 경우
						}
					}.bind(this) // `this` 바인딩
				});
			}.bind(this));
		},
			
		// 성공 시 처리 함수 (예: 화면 업데이트)
		handleSuccess: function(response,index) {
			var dates = this.saveProdOrder[index].MfgOrderPlannedStartDate;
			var oMainModel = this.getOwnerComponent().getModel("mainData");
			console.log("Response:", response.d);
			var dataArray = response.d;
			var updatedOData = {
				Status: "1", // 생성
				ManufacturingOrder: dataArray.ManufacturingOrder, // 생산 오더
				MfgOrderType: dataArray.SalesOrder && dataArray.SalesOrderItem ? "1" : "2", // 수주 : 양산
				SalesOrder: dataArray.SalesOrder,
				SalesOrderItem: dataArray.SalesOrderItem,
				ManufacturingOrderType: dataArray.ManufacturingOrderType,
				Material: dataArray.Material,
				ProductionPlant: dataArray.ProductionPlant,
				MfgOrderPlannedTotalQty: dataArray.TotalQuantity,
				ProductionVersion: dataArray.ProductionVersion,
				MfgOrderPlannedStartDate: dates,
				Yy1ProdRankOrd: dataArray.YY1_PROD_RANK_ORD,
				Yy1PrioRankOrd: dataArray.YY1_PRIO_RANK_ORD,
				Yy1ProdText: dataArray.YY1_PROD_TEXT_ORD,
				Message: ""
			};

			console.log("업데이트 값:", updatedOData);

			this._getODataCreate(oMainModel, "/ProdOrder", updatedOData)
				.done(function() {
					// Success callback
					this._getData();
				}.bind(this)) // `this` 바인딩
				.fail(function() {
					// Error callback
					this._getData();
				}.bind(this)); // `this` 바인딩
		},

		// 오류 시 처리 함수
		handleError: function(xhr,requestData, index) {
			var dates = this.saveProdOrder[index].MfgOrderPlannedStartDate;
			// 메인 모델 가져오기
			var oMainModel = this.getOwnerComponent().getModel("mainData");
			var error = "";
			try {
				error = xhr.responseJSON.error.message.value;
			} catch (e) {
				error = "오류 메시지를 추출하는 데 문제가 발생했습니다.";
			}
			// 오류 메시지 생성 (예: HTTP 상태 코드 및 에러 메시지)
			var errorMessage = "작업 지시 생성 중 오류가 발생했습니다. " + "에러 메시지: " + error;
			console.log("erromsg", errorMessage);
			var updatedOData = {
				Status: "2", // 에러
				ManufacturingOrder: "", // 생산 오더
				MfgOrderType: requestData.SalesOrder && requestData.SalesOrderItem ? "1" : "2", // 수주 : 양산
				SalesOrder: requestData.SalesOrder,
				SalesOrderItem: requestData.SalesOrderItem,
				ManufacturingOrderType: requestData.ManufacturingOrderType,
				Material: requestData.Material,
				ProductionPlant: requestData.ProductionPlant,
				MfgOrderPlannedTotalQty: requestData.TotalQuantity,
				ProductionVersion: requestData.ProductionVersion,
				MfgOrderPlannedStartDate: dates,
				Yy1ProdRankOrd: requestData.YY1_PROD_RANK_ORD,
				Yy1PrioRankOrd: requestData.YY1_PRIO_RANK_ORD,
				Yy1ProdText: requestData.YY1_PROD_TEXT_ORD,
				Message: errorMessage
			};
			console.log("변환된 값",updatedOData.MfgOrderPlannedTotalQty);
			console.log("업데이트 값:", updatedOData);

			this._getODataCreate(oMainModel, "/ProdOrder", updatedOData)
				.done(function() {
					// Success callback
					this._getData();
				}.bind(this)) // `this` 바인딩
				.fail(function() {
					// Error callback
					this._getData();
				}.bind(this)); // `this` 바인딩
		},

		// CSRF 토큰을 가져오는 함수
		getCSRFToken: function() {
			return $.ajax({
				url: "/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2",
				type: "GET",
				dataType: "json",
				headers: {
					"X-CSRF-Token": "Fetch"
				}
			}).then(function(data, textStatus, xhr) {
				return xhr.getResponseHeader("X-CSRF-Token");
			});
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

			this._mIntialWidth = {
				"status_col": "11rem",
				"mfgOrderType_col": "11rem",
				"manufacturingOrder_col": "11rem",
				"salesOrder_col": "11rem",
				"manufacturingOrderTypeName_col": "11rem",
				"material_col": "11rem",
				"productDescription_col": "11rem",
				"mfgOrderPlannedStartDate_col": "11rem",
				"mfgOrderPlannedTotalQty_col": "11rem",
				"baseUnit_col": "11rem",
				"productionVersion_col": "11rem",
				"yy1ProdRankOrd_col": "11rem",
				"yy1PrioRankOrd_col": "11rem",
				"yy1ProdText_col": "11rem",
				"message_col": "11rem"
			};

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

				const sKey = this._getKey(oColumn);
				const sColumnWidth = oState.ColumnWidth[sKey];

				oColumn.setWidth(sColumnWidth || this._mIntialWidth[sKey]);

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
