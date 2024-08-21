sap.ui.define([
    'dinewkorder/controller/BaseController',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageBox',
    'sap/m/MessageToast',
    'sap/m/MultiInput',
    'sap/m/SearchField',
    'sap/ui/model/type/String',
    'sap/m/Label',
    'sap/m/Column',
    'sap/ui/table/Column',
    'sap/m/Text',
    'sap/m/Input',
    'sap/m/Token',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/m/DatePicker',
    'sap/m/Select'
],
function (Controller, JSONModel, MessageBox, MessageToast, MultiInput, SearchField, TypeString, Label, MColumn, UIColumn, Text, Input, Token, Filter, FilterOperator, DatePicker, Select) {
    "use strict";

    return Controller.extend("dinewkorder.controller.PageSO", {
        onInit: function () {
			this.getRouter().getRoute("PageSO").attachMatched(this._onRouteMatched, this);

            this.initializeValueHelpInputs();

        },

		_onRouteMatched: function () {
            this._getData();
        },

        _getData: function () {
            this.modelData();

		},

        setModelData: function () {
            var inputIds = [
                "productVH", "plantVH", "prodVerVH", "salesOrderVH", "prodLvlVH", 
                "schedPriVH", "salesOrderItemVH", "materialVH", "plantVH", "mfgOrderType", "mfgOrderTypeName", 
                "mfgOrderPlannedTotalQty", "startDate", "lotSize", "prodDescription", "schedDescription", "prodAnnotaion"
            ];
            
            inputIds.forEach(function(sId) {
                var oControl = this.byId(sId);
                
                if (oControl instanceof MultiInput) {
                    // MultiInput의 경우 토큰을 지움
                    oControl.setTokens([]);
                } else if (oControl instanceof Input) {
                    // 일반 Input의 경우 값을 지움
                    oControl.setValue("");
                } else if (oControl instanceof DatePicker) {
                    // DatePicker의 경우 날짜를 초기화
                    oControl.setValue("");
                    oControl.setDateValue(null);
                } else if (oControl instanceof Select) {
                    // Select의 경우 선택된 키를 초기화
                    oControl.setSelectedKey(null);
                    oControl.setValue("");
                }
            }.bind(this));
        },         

        // model db
        modelData: function () {
            var oDineModel = this.getOwnerComponent().getModel("mainData");
            var oMainModel = this.getOwnerComponent().getModel("dineData");

            var rankModelData = function(url, modelName) {
            this._getODataRead(oDineModel, url).then(function(dinedata){
                this.setModel(new JSONModel(dinedata), modelName);
                }.bind(this));
            }.bind(this);

            // commonModelData 함수를 this와 바인딩하여 정의
            var commonModelData = function(url, modelName) {
                this._getODataRead(oMainModel, url).then(function(commonData) {
                    var oModel = new JSONModel(commonData);
                    this.setModel(oModel, modelName);
                    
                    if (modelName === "mfgOrderModel") { // 오더유형
                        
                        var oMfgOrderModel = this.getModel("mfgOrderModel"); // mfgOrderModel 참조
                        var oMfgData = oMfgOrderModel.getData(); // 모델 데이터 가져오기
                        
                        // ManufacturingOrderType이 "DN01"인 항목만 필터링
                        var filteredData = Array.isArray(oMfgData) ? oMfgData.filter(function(item) {
                            return item.ManufacturingOrderType === "DN01"; // 필터링 조건
                        }) : [];
                        
                        // 필터링된 데이터로 모델 업데이트
                        this.setModel(new JSONModel(filteredData), "mfgOrderModel");
                        
                        // 필터링된 데이터의 첫 번째 항목에서 ManufacturingOrderTypeName 가져오기
                        var aData = filteredData; // 필터링된 데이터 사용
                        if (aData.length > 0) {
                            var sSelectedKey = aData[0].ManufacturingOrderType; // 첫 번째 항목의 ManufacturingOrderType
                            console.log("Selected Key", sSelectedKey);
                        
                            // 첫 번째 항목의 ManufacturingOrderTypeName 가져오기
                            var sManufacturingOrderTypeName = aData.find(function(item) {
                                return item.ManufacturingOrderType === sSelectedKey;
                            })?.ManufacturingOrderTypeName || "";
                        
                            // 특정 입력 필드에 값 설정
                            var oInput = this.byId("mfgOrderTypeName"); 
                            oInput.setValue(sManufacturingOrderTypeName);
                        }
                }              
                }.bind(this));
            }.bind(this); // commonModelData 함수 자체에 this를 바인딩
        
            // 함수 호출 시 this가 올바르게 참조되도록 수정
            commonModelData("/SalesOrder", "soModel");
            commonModelData("/ProductionVersion", "prodVerModel"); 
            commonModelData("/MfgOrder", "mfgOrderModel"); 
            commonModelData("/Product", "productModel");
            commonModelData("/Plant", "plantModel");
            rankModelData("/ProdOrder", "dataModel");
            rankModelData("/ProdLvl", "prodLvlModel");
            rankModelData("/SchedPri", "schedPriModel");
            
        },

        // MultiInput 초기화 및 설정
        initializeValueHelpInputs: function() {
        this.aMultiInputs = ["materialVH", "plantVH", "prodVerVH", "salesOrderVH", "prodLvlVH", "schedPriVH", "salesOrderItemVH"];
    
        this.aMultiInputs.forEach(function(sId) {
            var oMultiInput = this.byId(sId);
            if (oMultiInput) {
                oMultiInput.attachBrowserEvent("focusout", this.onPageVHFocusOut.bind(this));
                oMultiInput.attachEvent("change", this.onTokenDelete, this);
                }
            }.bind(this));
        },   

        // valuehelp
        onPageVH: function (oEvent) {
            // ValueHelpDialog의 ID에 따라 변수를 설정
            var sValueHelpId = oEvent.getSource().getId();
            var filterName, label, keys, modelName, columnLabels, inputId, filterPaths;
        
            // ID에 따라 조건을 설정
            if (sValueHelpId.includes("prodVerVH")) {
                filterName = "ProductVerVH";
                label = "생산 버전";
                keys = ["ProductionVersion", "Material", "Plant", "ProductionVersionText"];
                modelName = "prodVerModel";
                columnLabels = ["생산 버전", "제품", "플랜트", "생산 버전명"];
                inputId = "prodVerVH";
                filterPaths = ["ProductionVersion", "Material", "Plant", "ProductionVersionText"];

            } else if (sValueHelpId.includes("salesOrderVH") || sValueHelpId.includes("salesOrderItemVH")) {
                filterName = "SalesOrderVH";
                keys = ["SalesOrder", "SalesOrderItem", "Material", "Plant", "OrderQuantity", "OrderQuantityUnit"];
                modelName = "soModel";
                columnLabels = ["판매 문서", "판매 문서 품목", "제품", "플랜트", "판매문서 수량", "판매문서 수량 단위"];
                if(sValueHelpId.includes("salesOrderVH")){
                    label = "판매 문서";
                    inputId = "salesOrderVH";
                } else {
                    label = "판매 문서 품목";
                    inputId = "salesOrderItemVH";
                }
                filterPaths = ["SalesOrder", "SalesOrderItem", "Material", "Plant", "OrderQuantity", "OrderQuantityUnit"];

            } else if (sValueHelpId.includes("prodLvlVH")) {
                filterName = "RankVH";
                label = "생산 순위";
                keys = ["Companycode", "Referencecodetype", "Referencecodeid", "Description", "Activestate", "Referencevalue"];
                modelName = "prodLvlModel";
                columnLabels = ["회사 코드", "참조 코드 타입", "참조 코드", "상세 설명", "활성화 여부", "참조 값"];
                inputId = "prodLvlVH";
                filterPaths = ["Companycode", "Referencecodetype", "Referencecodeid", "Description", "Activestate", "Referencevalue"];

            } else if (sValueHelpId.includes("schedPriVH")) {
                filterName = "RankVH";
                label = "우선 순위";
                keys = ["Companycode", "Referencecodetype", "Referencecodeid", "Description", "Activestate", "Referencevalue"];
                modelName = "schedPriModel";
                columnLabels = ["회사 코드", "참조 코드 타입", "참조 코드", "상세 설명", "활성화 여부", "참조 값"];
                inputId = "schedPriVH";
                filterPaths = ["Companycode", "Referencecodetype", "Referencecodeid", "Description", "Activestate", "Referencevalue"];

            } 
            var keyId = sValueHelpId.includes("salesOrderItemVH") ? keys[1] : (sValueHelpId.includes("prodLvlVH") || sValueHelpId.includes("schedPriVH") ? keys[2] : keys[0]);
            console.log("key",keyId);
            this.oSuggestion = new MultiInput();
            this.oSearchSuggestion = new SearchField();
        
            this.dialogSuggestion = this.loadFragment({
                name: `dinewkorder.view.Fragments.${filterName}`
            }).then(function (oDialogSuggestions) {
                var oFilterBar = oDialogSuggestions.getFilterBar();

                oDialogSuggestions.setKey(keyId);

                this.vhdSuggestions = oDialogSuggestions;
                this.getView().addDependent(oDialogSuggestions);

                // 필터링을 위한 Key 필드 설정
                oDialogSuggestions.setRangeKeyFields([{
                    label: label,
                    key: keyId, // 기본 키 필드 설정
                    type: "string",
                    typeInstance: new TypeString({}, {
                        maxLength: 7
                    })
                }]);
                console.log("key",keyId);
                // FilterBar의 기본 검색 설정
                oFilterBar.setFilterBarExpanded(false);
                oFilterBar.setBasicSearch(this.oSearchSuggestion);
        
                // 기본 검색이 실행될 때 FilterBar 검색 트리거
                this.oSearchSuggestion.attachSearch(function () {
                    oFilterBar.search();
                }.bind(this));
        
                oDialogSuggestions.getTableAsync().then(function (oTable) {
                    oTable.setModel(this.getOwnerComponent().getModel(modelName));

                    // 데스크톱의 기본 테이블은 sap.ui.table.Table
                    if (oTable.bindRows) {
                         // 필터링 적용
                    if (sValueHelpId.includes("salesOrderItemVH")) {
                        console.log("this.selectedSalesOrder",this.selectedSalesOrder);
                        oTable.bindAggregation("rows", {
                            path: `${modelName}>/`,
                            filters: [new Filter("SalesOrder", FilterOperator.EQ, this.selectedSalesOrder)],
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                    } else {
                        oTable.bindAggregation("rows", {
                            path: `${modelName}>/`,
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                    }
                        if (filterName === "ProductVerVH") {
                            // 생산 버전
                            var oColumnProductionVersion = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumnProductionVersion.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumnProductionVersion);
                            
                            // 플랜트
                            var oColumnPlant = new UIColumn({
                                label: new Label({ text: columnLabels[1] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[1]}}` })
                            });
                            oColumnPlant.data({ fieldName: keys[1] });
                            oTable.addColumn(oColumnPlant);
                            
                            // 제품
                            var oColumnMaterial = new UIColumn({
                                label: new Label({ text: columnLabels[2] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[2]}}` })
                            });
                            oColumnMaterial.data({ fieldName: keys[2] });
                            oTable.addColumn(oColumnMaterial);

                             // 생산 버전명
                             var oColumnProductionVersionText = new UIColumn({
                                label: new Label({ text: columnLabels[3] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[3]}}` })
                            });
                            oColumnProductionVersionText.data({ fieldName: keys[3] });
                            oTable.addColumn(oColumnProductionVersionText);

                        } else if (filterName === "SalesOrderVH") {
                            // 판매 문서
                            var oColumnSalesOrder = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumnSalesOrder.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumnSalesOrder);

                            // 판매 문서 품목
                            var oColumnSalesOrderItem = new UIColumn({
                                label: new Label({ text: columnLabels[1] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[1]}}` })
                            });
                            oColumnSalesOrderItem.data({ fieldName: keys[1] });
                            oTable.addColumn(oColumnSalesOrderItem);
                            
                            // 제품
                            var oColumnMaterial = new UIColumn({
                                label: new Label({ text: columnLabels[2] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[2]}}` })
                            });
                            oColumnMaterial.data({ fieldName: keys[2] });
                            oTable.addColumn(oColumnMaterial);

                            // 플랜트
                            var oColumnPlant = new UIColumn({
                                label: new Label({ text: columnLabels[3] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[3]}}` })
                            });
                            oColumnPlant.data({ fieldName: keys[3] });
                            oTable.addColumn(oColumnPlant);
                            
                            // 판매문서 수량
                            var oColumnOrderQuantity = new UIColumn({
                                label: new Label({ text: columnLabels[4] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[4]}}` })
                            });
                            oColumnOrderQuantity.data({ fieldName: keys[4] });
                            oTable.addColumn(oColumnOrderQuantity);

                            // 판매문서 수량 단위
                            var oColumnOrderQuantityUnit = new UIColumn({
                                label: new Label({ text: columnLabels[5] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[5]}}` })
                            });
                            oColumnOrderQuantityUnit.data({ fieldName: keys[5] });
                            oTable.addColumn(oColumnOrderQuantityUnit);
                        } else if (filterName === "RankVH") {
                            // 회사 코드
                            var oColumnCompanycode = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumnCompanycode.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumnCompanycode);
                            
                            // 참조 코드 타입
                            var oColumnReferencecodetype = new UIColumn({
                                label: new Label({ text: columnLabels[1] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[1]}}` })
                            });
                            oColumnReferencecodetype.data({ fieldName: keys[1] });
                            oTable.addColumn(oColumnReferencecodetype);
                            
                            // 참조 코드
                            var oColumnReferencecodeid = new UIColumn({
                                label: new Label({ text: columnLabels[2] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[2]}}` })
                            });
                            oColumnReferencecodeid.data({ fieldName: keys[2] });
                            oTable.addColumn(oColumnReferencecodeid);
                            
                            // 상세 설명
                            var oColumnDescription = new UIColumn({
                                label: new Label({ text: columnLabels[3] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[3]}}` })
                            });
                            oColumnDescription.data({ fieldName: keys[3] });
                            oTable.addColumn(oColumnDescription);

                            // 활성화 여부
                            var oColumnActivestate = new UIColumn({
                                label: new Label({ text: columnLabels[4] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[4]}}` })
                            });
                            oColumnActivestate.data({ fieldName: keys[4] });
                            oTable.addColumn(oColumnActivestate);

                            // 참조값
                            var oColumnReferencevalue = new UIColumn({
                                label: new Label({ text: columnLabels[5] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[5]}}` })
                            });
                            oColumnReferencevalue.data({ fieldName: keys[5] });
                            oTable.addColumn(oColumnReferencevalue);
                        }
                    }
        
                    // 모바일의 기본 테이블은 sap.m.Table
                    if (oTable.bindItems) {
                        var cells = keys.map(function (key, index) {
                            return new Label({ text: `{${modelName}>${key}}` });
                        });
        
                        oTable.bindAggregation("items", {
                            path: `${modelName}/`,
                            template: new ColumnListItem({
                                cells: cells
                            }),
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
        
                        columnLabels.forEach(function (label) {
                            oTable.addColumn(new MColumn({ header: new Label({ text: label }) }));
                        });
                    }
                    var oMultiInput = this.byId("salesOrderItemVH");

                    if(oMultiInput){
                        console.log("om",oMultiInput);
                        console.log("dd",this.selectedSalesOrder);
                        oMultiInput.getBinding("suggestionRows").filter(new Filter("SalesOrder", FilterOperator.EQ, this.selectedSalesOrder));
                    }
                    oDialogSuggestions.update();
                }.bind(this));
        
                if (this.byId(inputId)) {
                    this.oMultiInputSuggestion = this.byId(inputId);
                } else {
                    MessageBox.error(`MultiInput의 ID '${inputId}'를 찾을 수 없습니다.`);
                }
        
                if (this.oMultiInputSuggestion) {
                    oDialogSuggestions.setTokens(this.oMultiInputSuggestion.getTokens());
                }
                // 데이터 속성으로 filterPaths 전달
            oDialogSuggestions.data("filterPaths", filterPaths);
                oDialogSuggestions.open();
            }.bind(this));
            this.initializeValueHelpInputs();
        },

        onPageVHOk: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this.oMultiInputSuggestion.setTokens(aTokens);

            if (this.oMultiInputSuggestion.getId().includes("salesOrderVH")) {
                this.selectedSalesOrder = aTokens.map(function (token) {
                    return token.getKey(); // 선택된 판매 문서 값
                });
                if(this.selectedSalesOrder){
                    this.byId("salesOrderItemVH").setTokens([]);
                    this.byId("materialVH").setValue("");
                    this.byId("plantVH").setValue("");
                    this.byId("mfgOrderPlannedTotalQty").setValue("");
                }
            }

             // 판매 문서 제품, 플랜트 설정
             if (this.oMultiInputSuggestion.getId().includes("salesOrderItemVH")) {
                var oModel = this.getModel("soModel");
                var aData = oModel.getProperty("/");
                var soTokens = this.selectedSalesOrder; // 선택된 판매 주문 토큰 배열
                var materialText = "";
                var plantText = "";
                var mfgQtyText = 0;
                var aSalesOrderItemTokens = this.byId("salesOrderItemVH").getTokens();
        
                // 모델 데이터에서 일치하는 항목을 찾기
                for (var i = 0; i < aData.length; i++) {
                    if (soTokens.includes(aData[i]["SalesOrder"])) {
                        for (var j = 0; j < aSalesOrderItemTokens.length; j++) {
                            var sKey = aSalesOrderItemTokens[j].getKey();
                            if (aData[i]["SalesOrderItem"] === sKey) {
                                materialText = aData[i]["Material"]; // 첫 번째 텍스트 데이터
                                plantText = aData[i]["Plant"];    // 두 번째 텍스트 데이터
                                mfgQtyText = parseFloat(aData[i]["OrderQuantity"] || 0);
                                break;
                            }
                        }
                        if (materialText && plantText && mfgQtyText) break; // 일치하는 항목을 찾으면 종료
                    }
                }
                 // 기생성된 작업 지시 수량 가져오기
                var oDataModel = this.getModel("dataModel").getData();
                var mfgQtydata = 0; // 초기화
                 
                 // 데이터 모델에서 기 생성된 작업 지시 수량을 더합니다.
                oDataModel.forEach(function(data) {
                     if (data.SalesOrder === soTokens[0] && data.SalesOrderItem === sKey) {
                        mfgQtydata += parseFloat(data.MfgOrderPlannedTotalQty) || 0;
                     }
                });
                 
                // mfgQtydata를 this.mfgQtydata로 저장하여 사용
                this.mfgQtydata = mfgQtydata;
                
                // 두 개의 입력 필드에 값 설정
                var oMaterialInput = this.byId("materialVH");
                var oPlantInput = this.byId("plantVH");
                var oMfgQtyInput = this.byId("mfgOrderPlannedTotalQty");
                if (oMaterialInput) {
                    oMaterialInput.setValue(materialText || ""); // 값이 없으면 빈 문자열로 설정
                }
                
                if (oPlantInput) {
                    oPlantInput.setValue(plantText || ""); // 값이 없으면 빈 문자열로 설정
                }

                if (oMfgQtyInput) {
                    oMfgQtyInput.setValue(mfgQtyText ? (mfgQtyText - this.mfgQtydata) || 0 : 0); // 값이 없으면 빈 문자열로 설정
                }
            }

            // 생산 순위 내역 및 우선 순위 내역 input 데이터 추가
            if(this.oMultiInputSuggestion.getId().includes("prodLvlVH")){
                var RidToken = this.byId("prodLvlVH").getTokens();
                var inputText;
                var oModel = this.getModel("prodLvlModel");
                var aData = oModel.getProperty("/");
                for (var i = 0; i < aData.length; i++) {
                    for (var j = 0; j < RidToken.length; j++) {
                        var sKey = RidToken[j].getKey();
                        if (aData[i]["Referencecodeid"] === sKey) {
                            inputText = aData[i]["Description"];
                            break;
                        }
                    }
                }
                var oInput = this.byId("prodDescription");
                oInput.setValue(inputText);
            }
            if(this.oMultiInputSuggestion.getId().includes("schedPriVH")){
                var RidToken = this.byId("schedPriVH").getTokens();
                var inputText;
                var oModel = this.getModel("schedPriModel");
                var aData = oModel.getProperty("/");
                for (var i = 0; i < aData.length; i++) {
                    for (var j = 0; j < RidToken.length; j++) {
                        var sKey = RidToken[j].getKey();
                        if (aData[i]["Referencecodeid"] === sKey) {
                            inputText = aData[i]["Description"];
                            break;
                        }
                    }
                }
                var oInput = this.byId("schedDescription");
                oInput.setValue(inputText);
            }

			this.vhdSuggestions.close();
		},

		onPageVHCancel: function () {
			this.vhdSuggestions.close();
		},        

        onPageVHClose: function () {
			this.vhdSuggestions.destroy();
		},

        onPageVHSearch: function (oEvent) {
            // 데이터 속성에서 filterPaths 가져오기
            var filterPaths = this.vhdSuggestions.data("filterPaths");
        
            // SearchField의 검색어와 선택된 필터들을 가져오기
            var sSearchQuery = this.oSearchSuggestion.getValue();
            var aSelectionSet = oEvent.getParameter("selectionSet");
            
            // 필터를 생성
            var aFilters = aSelectionSet ? aSelectionSet.reduce(function (aResult, oControl) {
                if (oControl.getValue()) {
                    aResult.push(new Filter({
                        path: oControl.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    }));
                }
                return aResult;
            }, []) : [];
        
            // 검색어를 기반으로 필터 추가
            if (sSearchQuery) {
                var searchFilters = filterPaths.map(function (path) {
                    return new Filter({
                        path: path,
                        operator: FilterOperator.Contains,
                        value1: sSearchQuery
                    });
                });
                aFilters.push(new Filter({
                    filters: searchFilters,
                    and: false
                }));
            }
        
            // 필터 적용
            var oVHD = this.vhdSuggestions;
            oVHD.getTableAsync().then(function (oTable) {
                if (oTable.bindRows) {
                    oTable.getBinding("rows").filter(new Filter({
                        filters: aFilters,
                        and: true
                    }));
                }
                if (oTable.bindItems) {
                    oTable.getBinding("items").filter(new Filter({
                        filters: aFilters,
                        and: true
                    }));
                }
                oVHD.update();
            });
        },        

        // suggestion 선택 
        onPageVHSelected: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var oSelectedItem = oEvent.getParameter("selectedRow"); // 선택된 행 가져오기
            console.log("osi",oSelectedItem);
            var sValueHelpId = oMultiInput.getId();
            var contextModel ,contextProperty, sKeyData, sTextData, sId; 
            if(sValueHelpId.includes("prodVerVH")){
                contextModel = "prodVerModel";
                contextProperty = "ProductionVersion";

            } else if(sValueHelpId.includes("salesOrderVH") || sValueHelpId.includes("salesOrderItemVH")){
                contextModel = "soModel";
                if(sValueHelpId.includes("salesOrderVH")){
                    contextProperty = "SalesOrder";
                } else {
                    contextProperty = "SalesOrderItem";
                    sKeyData = "SalesOrderItem";
                    sTextData = ["Material","Plant", "OrderQuantity"];
                    sId = ["materialVH", "plantVH", "mfgOrderPlannedTotalQty"];
                }
            } else if(sValueHelpId.includes("prodLvlVH")){
                contextModel = "prodLvlModel";
                contextProperty = "Referencecodeid";
                sKeyData = "Referencecodeid";
                sTextData = "Description";
                sId = "prodDescription";

            } else if(sValueHelpId.includes("schedPriVH")){
                contextModel = "schedPriModel";
                contextProperty = "Referencecodeid";
                sKeyData = "Referencecodeid";
                sTextData = "Description";
                sId = "schedDescription";

            }
            if (oSelectedItem) {
                var oContext = oSelectedItem.getBindingContext(contextModel);
                var sKey = oContext.getProperty(contextProperty); // 키 값 가져오기
                var oModel = this.getModel(contextModel);
                var aData = oModel.getProperty("/");

                // 현재 MultiInput에 존재하는 토큰들을 가져오기
                var aExistingTokens = oMultiInput.getTokens();

                    // 중복된 토큰이 있는지 확인
                    var bTokenExists = aExistingTokens.some(function (oToken) {
                        return oToken.getKey() === sKey;
                    });

                    // 판매 문서 제품, 플랜트 설정
                    if (contextProperty === "SalesOrderItem") {
                        var soTokens = this.selectedSalesOrder; // 선택된 판매 주문 토큰 배열
                        var materialText = "";
                        var plantText = "";
                        var mfgQtyText = "";
                
                        // 모델 데이터에서 일치하는 항목을 찾기
                        for (var i = 0; i < aData.length; i++) {
                            if (soTokens.includes(aData[i]["SalesOrder"])) {
                                if (aData[i][sKeyData] === sKey) {
                                    materialText = aData[i][sTextData[0]]; // 첫 번째 텍스트 데이터
                                    plantText = aData[i][sTextData[1]];    // 두 번째 텍스트 데이터
                                    mfgQtyText = aData[i][sTextData[2]];
                                   
                                    break;
                                }
                            }
                        }
                
                        // 두 개의 입력 필드에 값 설정
                        var oMaterialInput = this.byId(sId[0]);
                        var oPlantInput = this.byId(sId[1]);
                        var oMfgQtyInput = this.byId(sId[2]);
                
                        if (oMaterialInput) {
                            oMaterialInput.setValue(materialText || ""); // 값이 없으면 빈 문자열로 설정
                        }
                
                        if (oPlantInput) {
                            oPlantInput.setValue(plantText || ""); // 값이 없으면 빈 문자열로 설정
                        }

                        if (oMfgQtyInput) {
                            oMfgQtyInput.setValue(mfgQtyText || ""); // 값이 없으면 빈 문자열로 설정
                        }
                    }
                    // 생산 순위 내역 및 우선 순위 내역 input 데이터 추가
                    if(contextModel === "prodLvlModel" || contextModel === "schedPriModel"){
                        var inputText;
                        for (var i = 0; i < aData.length; i++) {
                            if (aData[i][sKeyData] === sKey) {
                                inputText = aData[i][sTextData];
                                break;
                            }
                        }
                        var oInput = this.byId(sId);
                        console.log("oInput", oInput);
                        console.log("inputText", inputText);
                        oInput.setValue(inputText);
                    }

                    // 중복된 토큰이 없을 경우에만 새 토큰을 추가
                    if (!bTokenExists) {
                        oMultiInput.addToken(new Token({
                            key: sKey,
                            text: sKey
                        }));
                    } else {
                        // 중복된 토큰이 있는 경우, 사용자에게 메시지 표시 (선택 사항)
                        MessageToast.show("이미 추가된 토큰입니다.");
                    }

                    // 입력 값을 지우기 (선택 후 텍스트 박스를 비움)
                    oMultiInput.setValue("");
            }
        },

        // 포커스 아웃 이벤트 핸들러
        onPageVHFocusOut: function (oEvent) {
            // jQuery 이벤트 객체로부터 ID 가져오기
            var sId = oEvent.target.id;
        
            // ID에 따라 적절한 MultiInput ID 선택
            var inputId;
            if (sId.includes("prodVerVH")) {
                inputId = "prodVerVH";
            } else if (sId.includes("salesOrderVH")) {
                inputId = "salesOrderVH";
            } else if (sId.includes("prodLvlVH")) {
                inputId = "prodLvlVH";
            } else if (sId.includes("schedPriVH")) {
                inputId = "schedPriVH";
            } else if (sId.includes("salesOrderItemVH")) {
                inputId = "salesOrderItemVH";
            } 
        
            // 해당 ID의 MultiInput 인스턴스 가져오기
            var oMultiInput = this.byId(inputId);
            if(oMultiInput){
            // 텍스트 필드를 지우기
            oMultiInput.setValue("");
            }
        },

        // 토큰 삭제 될 때 기존 값 삭제하기 
        onTokenDelete: function (oEvent) {
            // 삭제된 토큰의 정보를 가져옵니다
            var oToken = oEvent.getParameter("token");
        
            // MultiInput의 ID를 확인하여 필요한 필드의 값을 지우기
            var sMultiInputId = this.oMultiInputSuggestion.getId();
            if (sMultiInputId.includes("salesOrderItemVH")) {
                var oMaterialInput = this.byId("materialVH");
                var oPlantInput = this.byId("plantVH");
              
                if (oMaterialInput) {
                    oMaterialInput.setValue("");
                }
                if (oPlantInput) {
                    oPlantInput.setValue("");
                }
            }
        },

        onTokenUpdate: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var aTokens = oMultiInput.getTokens();
            if(this.selectedSalesOrder===0){
                var salesItemToken = this.byId("salesOrderItemVH").setTokens([]);
                console.log("sit",salesItemToken);
            }
            // 단일 토큰만 허용하도록 설정
            if (aTokens.length > 0) {
                oMultiInput.removeAllTokens();
                MessageToast.show("하나의 항목만 입력할 수 있습니다.");
            }
        },
        // value help 끝

        // 오더 유형 타입 내역 데이터
        getMfgOrderTypeName: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey(); // 선택된 ManufacturingOrderType
            var oMfgOrderModel = this.getModel("mfgOrderModel");
            var aData = oMfgOrderModel.getProperty("/"); // 모델의 전체 데이터 배열
            
            // 선택된 ManufacturingOrderType에 해당하는 이름 찾기
            var sManufacturingOrderTypeName = "";
            for (var i = 0; i < aData.length; i++) {
                if (aData[i].ManufacturingOrderType === sSelectedKey) {
                    sManufacturingOrderTypeName = aData[i].ManufacturingOrderTypeName;
                    break;
                }
            }
            console.log("sManufacturingOrderTypeName",sManufacturingOrderTypeName);
            // Input 필드에 ManufacturingOrderTypeName 설정
            var oInput = this.byId("mfgOrderTypeName"); 
            oInput.setValue(sManufacturingOrderTypeName);
            console.log("oi",oInput);
        },

        // 저장
        onSave: function () {

            // 로트 사이즈 값 가져오기
            var lotSize = this.byId("lotSize").getValue();
            console.log("lotsize",lotSize);
            // 입력 값을 가져오는 함수
            var getInputValue = function(id, defaultValue) {
                // 특정 ID의 토큰 값을 가져와 첫 번째 토큰의 키 값을 반환하거나 기본값을 반환
                return this.byId(id).getTokens().map(function(token) { return token.getKey(); })[0] || defaultValue;
            }.bind(this);
            
            // 텍스트 필드에서 값을 가져오는 함수
            var getValue = function(id) {
                return this.byId(id).getValue();
            }.bind(this);
            
            // 날짜 필드에서 날짜 값을 가져오는 함수
            var getDateValue = function(id) {
                return this.byId(id).getDateValue();
            }.bind(this);

            // 입력 데이터 변수 선언
            var sSalesOrder = getInputValue("salesOrderVH"); // 판매 문서
            var sSalesOrderItem = getInputValue("salesOrderItemVH"); // 판매 문서 품목
            var manufacturingOrderType = this.byId("mfgOrderType").getSelectedKey(); // 제조 오더 유형
            var material = getValue("materialVH"); // 자재
            var productionPlant = getValue("plantVH"); // 생산 플랜트
            var totalQuantity = parseFloat(getValue("mfgOrderPlannedTotalQty")); // 총 작업 수량
            var productionVersion = getInputValue("prodVerVH"); // 생산 버전
            var mfgOrderPlannedStartDate = getDateValue("startDate"); // 작업 시작일
            var prodRankOrd = getInputValue("prodLvlVH"); // 생산 순위
            var prioRankOrd = getInputValue("schedPriVH"); // 우선 순위
            var prodText = getValue("prodAnnotaion"); // 생산 주석
            console.log("mfgOrderPlannedStartDate",mfgOrderPlannedStartDate);
            this.mfgOrderPlannedStartDate = mfgOrderPlannedStartDate;
            
            // 필수 입력값 검증
            if (!sSalesOrder || !sSalesOrderItem || !productionVersion || !manufacturingOrderType || isNaN(totalQuantity) || !mfgOrderPlannedStartDate) {
                MessageBox.error("필수 값을 입력해주세요."); // 필수 값이 입력되지 않았을 때 오류 메시지 표시
                return;
            } else if (parseFloat(totalQuantity) <= 0) {
                MessageBox.error("작업지시 수량은 0보다 커야합니다.");
                return;
            } else if (parseFloat(totalQuantity) <= parseFloat(lotSize)) {
                MessageBox.error("로트 사이즈는 작업지시 수량과 같거나 작아야합니다.");
                return;

            } else if (parseFloat(lotSize) <= 0 ) {
                MessageBox.error("로트 사이즈는 0 보다 커야합니다.");
                return;
            } else if ( lotSize === ""){ // 로트 사이즈가 없을 때 작업지시 수량 넣기
                lotSize = parseFloat(totalQuantity);
            }

            // 데이터 모델에서 판매 문서 수량 가져오기
            var oSoModel = this.getModel("soModel").getData();
            var oDataModel = this.getModel("dataModel").getData();
            
            // 판매 문서에서 해당 품목의 총 수량을 구함
            var mfgQty = oSoModel.reduce(function(acc, sdata) {
                // 만약 현재 데이터의 판매 문서와 품목이 일치하면 수량을 반환
                return (sdata.SalesOrder === sSalesOrder && sdata.SalesOrderItem === sSalesOrderItem) 
                    ? parseFloat(sdata.OrderQuantity) : acc;
            }, 0); // acc는 누적 값, 초기값은 0
            
            // 기존 작업 지시 수량을 구함
            var mfgQtyData = oDataModel.reduce(function(acc, data) {
                // 만약 현재 데이터의 판매 문서와 품목이 일치하면 기 생성된 수량을 누적
                return (data.SalesOrder === sSalesOrder && data.SalesOrderItem === sSalesOrderItem) 
                    ? acc + (data.MfgOrderPlannedTotalQty || 0) : acc;
            }, 0); // acc는 누적 값, 초기값은 0

            // 남은 작업 수량 계산
            var remainingQty = mfgQty - mfgQtyData;

            // 작업 지시 수량이 남은 수량을 초과하는지 확인
            if (totalQuantity > remainingQty) {
                MessageBox.error("작업 지시 수량은 (판매 문서의 수량 - 기 생성된 생산 오더의 수량)보다 작아야 합니다.");
                return;
            }
            
            // 작업 지시 수량 계산
            var numOrders = Math.floor(totalQuantity / lotSize); // 로트 사이즈로 나누어진 작업 지시 수량
            var remainderQty = totalQuantity % lotSize; // 나머지 수량

            // 작업 지시 데이터 생성 함수
            var createOrderData = function(qty) {
                return {
                    MfgOrderType:"1", // 수주
                    SalesOrder: sSalesOrder,
                    SalesOrderItem: sSalesOrderItem,
                    ManufacturingOrderType: manufacturingOrderType,
                    Material: material,
                    ProductionPlant: productionPlant,
                    MfgOrderPlannedTotalQty: qty,
                    ProductionVersion: productionVersion,
                    MfgOrderPlannedStartDate: mfgOrderPlannedStartDate,
                    Yy1ProdRankOrd: prodRankOrd,
                    Yy1PrioRankOrd: prioRankOrd,
                    Yy1ProdText: prodText
                };
            };

            // 작업 지시 데이터를 담을 배열
            var oDataArray = [];
            this.oDataArray = oDataArray;
            for (var i = 0; i < numOrders; i++) {
                this.oDataArray.push(createOrderData(lotSize)); // 로트 사이즈에 맞춰 작업 지시 데이터 추가
            }
            if (remainderQty > 0) {
                this.oDataArray.push(createOrderData(remainderQty.toString())); // 나머지 수량에 대한 작업 지시 데이터 추가
            }

            // 날짜 포맷 함수 (시간을 T00:00:00으로 설정)
            function toDateFormat(dateString) {
                var date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    throw new Error('Invalid date format');
                }
                // 날짜를 YYYY-MM-DD 형식으로 변환
                var formattedDate = date.toISOString().split('T')[0];
                // T00:00:00을 붙여서 전체 포맷을 YYYY-MM-DDT00:00:00으로 설정
                return `${formattedDate}T00:00:00`;
            }

            // 데이터 포맷 변환
            var postArray = this.oDataArray.map(function(data) {
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

            console.log("postArray", postArray); // 디버깅을 위한 로그 출력

            this.csrfToken = "";

            // CSRF 토큰을 가져오는 함수 호출
            this.getCSRFToken().then(function(token) {
                this.csrfToken = token; // CSRF 토큰 저장
                console.log("token", this.csrfToken);
                
                this.saveData = postArray;
                // POST 요청을 보내는 함수 호출
                var postPromises = postArray.map(function(data,index) {  
                
                console.log("parr",this.saveData);

                    console.log(".saveDataTotalQuantity", this.saveData.TotalQuantity);
                    return this.postProductionOrder(data); // 각 요청에 대한 Promise 반환
                }.bind(this)); // `this` 바인딩
        
                // 모든 POST 요청이 완료될 때까지 대기
                Promise.all(postPromises)
                    .then(function() {
                        console.log("모든 POST 요청 완료");
                        MessageBox.success("작업 지시 생성이 완료되었습니다.");
                        
                    }.bind(this))
                    .catch(function(err) {
                        console.error("POST 요청 중 오류 발생:", err);
                        MessageBox.error("작업 지시 생성 중 오류가 발생했습니다.");
                    }.bind(this));
            }.bind(this)).catch(function(err) {
                console.error("CSRF 토큰 요청 중 오류 발생:", err);
            });
        },
        
        postProductionOrder: function(data) {
            console.log("data", data);
        
            // `$.ajax`를 `Promise`로 래핑
            return new Promise(function(resolve, reject) {
                $.ajax({
                    url: "/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2",
                    type: "POST",
                    data: JSON.stringify(data),
                    dataType: "json",
                    contentType: "application/json",
                    headers: {
                        "X-CSRF-Token": this.csrfToken
                    },
                    success: function(response) {
                        try {
                            this.handleSuccess(response); // `this`를 바인딩하여 콜백 함수에 전달
                            resolve(); // 성공 시 Promise 해결
                        } catch (error) {
                            reject(error); // `handleSuccess`에서 오류가 발생한 경우
                        }
                    }.bind(this), // `this` 바인딩
                    error: function(xhr) {
                        try {
                            this.handleError(xhr); // `this`를 바인딩하여 콜백 함수에 전달
                            reject(xhr); // 실패 시 Promise 거부
                        } catch (error) {
                            reject(error); // `handleError`에서 오류가 발생한 경우
                        }
                    }.bind(this) // `this` 바인딩
                });
            }.bind(this));
        },
            
            // 성공 시 처리 함수 (예: 화면 업데이트)
            handleSuccess: function(response) {
                var oMainModel = this.getOwnerComponent().getModel("mainData");
                console.log("Response:", response.d);
                var dataArray = response.d;
                var updatedOData = {
                    Status: "1", // 생성
                    ManufacturingOrder: dataArray.ManufacturingOrder, // 생산 오더
                    MfgOrderType: "1", // 수주
                    SalesOrder: dataArray.SalesOrder,
                    SalesOrderItem: dataArray.SalesOrderItem,
                    ManufacturingOrderType: dataArray.ManufacturingOrderType,
                    Material: dataArray.Material,
                    ProductionPlant: dataArray.ProductionPlant,
                    MfgOrderPlannedTotalQty: dataArray.TotalQuantity,
                    ProductionVersion: dataArray.ProductionVersion,
                    MfgOrderPlannedStartDate: this.mfgOrderPlannedStartDate,
                    Yy1ProdRankOrd: dataArray.YY1_PROD_RANK_ORD,
                    Yy1PrioRankOrd: dataArray.YY1_PRIO_RANK_ORD,
                    Yy1ProdText: dataArray.YY1_PROD_TEXT_ORD,
                    Message: ""
                };

                console.log("업데이트 값:", updatedOData);

                this._getODataCreate(oMainModel, "/ProdOrder", updatedOData)
                    .done(function() {
                        // Success callback
                        this.setModelData();
                        this.navTo("Main", {});
                    }.bind(this)) // `this` 바인딩
                    .fail(function() {
                        // Error callback
                        this.setModelData();
                        this.navTo("Main", {});
                    }.bind(this)); // `this` 바인딩
            },

            // 오류 시 처리 함수
            handleError: function(xhr) {
                console.log("data2", this.saveData);

                // 메인 모델 가져오기
                var oMainModel = this.getOwnerComponent().getModel("mainData");
                var error = "";
                this.saveData.map(function(errorData){
                try {
                    error = xhr.responseJSON.error.message.value;
                } catch (e) {
                    error = "오류 메시지를 추출하는 데 문제가 발생했습니다.";
                }
                // 오류 메시지 생성 (예: HTTP 상태 코드 및 에러 메시지)
                var errorMessage = "작업 지시 생성 중 오류가 발생했습니다. " + "에러 메시지: " + error;
                console.log("erromsg", errorMessage);

                console.log("에러 데이터",errorData.TotalQuantity);
                var updatedOData = {
                    Status: "2", // 에러
                    ManufacturingOrder: "", // 생산 오더
                    MfgOrderType: "1", // 수주
                    SalesOrder: errorData.SalesOrder,
                    SalesOrderItem: errorData.SalesOrderItem,
                    ManufacturingOrderType: errorData.ManufacturingOrderType,
                    Material: errorData.Material,
                    ProductionPlant: errorData.ProductionPlant,
                    MfgOrderPlannedTotalQty: errorData.TotalQuantity,
                    ProductionVersion: errorData.ProductionVersion,
                    MfgOrderPlannedStartDate: this.mfgOrderPlannedStartDate,
                    Yy1ProdRankOrd: errorData.YY1_PROD_RANK_ORD,
                    Yy1PrioRankOrd: errorData.YY1_PRIO_RANK_ORD,
                    Yy1ProdText: errorData.YY1_PROD_TEXT_ORD,
                    Message: errorMessage
                };
                console.log("변환된 값",updatedOData.MfgOrderPlannedTotalQty);
                console.log("업데이트 값:", updatedOData);

                this._getODataCreate(oMainModel, "/ProdOrder", updatedOData)
                    .done(function() {
                        // Success callback
                        this.setModelData();
                        this.navTo("Main", {});
                    }.bind(this)) // `this` 바인딩
                    .fail(function() {
                        // Error callback
                        this.setModelData();
                        this.navTo("Main", {});
                    }.bind(this)); // `this` 바인딩
                }.bind(this));
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

        // 메인 페이지 이동
		onCancel: function () {
            this.setModelData();
			this.navTo("Main",{});
		}
    });
});
  