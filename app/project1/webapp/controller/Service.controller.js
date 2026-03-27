/**
* Services Controller (V1.0).
* This Controller used to display list of services to create order and do payment
* @author MM
* @date 10.05.2025
*/


sap.ui.define([
    'adnoc/vi/vehicleinspection/core/generic/genericentryform',
    "sap/ui/core/UIComponent",
    "sap/ui/core/mvc/XMLView",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    'adnoc/vi/vehicleinspection/modone/constants/Constant',
    'adnoc/vi/vehicleinspection/modone/constants/ControlIds',
    'adnoc/vi/vehicleinspection/modone/formatter/Formatter',
    'sap/ui/model/json/JSONModel',
    'sap/m/IconTabFilter',
    "sap/f/library",
], function (genericentryform, UIComponent, XMLView, Fragment, MessageToast, MessageBox, Constant, ControlIds, Formatter, JSONModel, IconTabFilter, fioriLibrary) {
    "use strict";
    let LayoutType = fioriLibrary.LayoutType;
    let aPreviousData = [];
    let sRetestOrFresh;
    let isModified = false;
    return genericentryform.extend("adnoc.vi.vehicleinspection.modone.controller.Services", {
        /**
         * Function using for to Load Page
         * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
         * @version 1.0.0
         * @since 10.02.2025
         * @fires onInit
         * @author MM
         */

        onInit: function () {
            genericentryform.prototype.onInit.apply(this, arguments);
            let oPlateData = {
                platesDetails: [{
                    plateNo: ""
                }]
            }
            let oPlateDataModel = new JSONModel();
            this.getView().setModel(oPlateDataModel, 'PlateDataModel');
            oPlateDataModel.setData(oPlateData);
            // this._oRouter = UIComponent.getRouterFor(this);

            // //  Avoid duplicate
            // if (this._handleRouteMatchedRef) {
            //     this._oRouter.detachRouteMatched(this._handleRouteMatchedRef, this);
            // }

            this._bKeepPage = false;
            let oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute(Constant.Services).attachPatternMatched(this._onRouteMatched, this);

        },

        /**
         * Function using for route match based on conditions
         * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
         * @version 1.0.0
         * @since 10.02.2025
         * @fires _onRouteMatched,_handleRouteMatched,clearAllTabs
         * @author MM
         */

        _onRouteMatched: async function (oEvent) {
            var oGlobalModel = this.getView().getModel("oGlobalModel");
            let isPayment = oGlobalModel.getProperty("/IsFromPayment");

            //  Case 1: Coming from Payment
            if (isPayment) {
                this._handleRouteMatched(oEvent);
                return;
            }

            // Case 2: First time page load or refresh
            if (!this._bKeepPage) {
                this._bKeepPage = false; // Reset flag (optional, depends on usage)
                // Reset page model data
                const oSalesModel = this.getView().getModel("SalesOrderCardDataModel");
                this.getView().getModel("oGlobalModel").setProperty("/isAddMoreClicked", false);
                oSalesModel.setProperty("/MyCartCount", 0);
                oSalesModel.setProperty("/MyCartItems", []);
                oSalesModel.setProperty("/PlateNo", null);
                oSalesModel.setProperty("/PlateMaterials", []);
                oGlobalModel.setProperty("/OrderResponse", []);
                this.clearAllTabs();
            }

            // Final common call
            this._handleRouteMatched(oEvent);
        },


        /**
         * Function using for show initilization calling process
         * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
         * @version 1.0.0
         * @since 10.02.2025
         * @fires onBeforeShow,initialize,setEntryFormDataSourceURLForEditMode,showEntryForm
         * @author MM
         */

        onBeforeShow: async function () {
            this.initialize();
            this.setEntryFormDataSourceURLForEditMode('');
            await this.showEntryForm();
        },

        /**
        * Function for Initilization for Generic Required Function
        * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
        * @version 1.0.0
        * @since 10.02.2025
        * @fires initialize,
        * @author MM
        */

        initialize: async function () {

            let isBackTrigger = this.getView().getModel("oGlobalModel").getProperty("/isBackToOrder");
            this.oBundle = this.getView().getModel("i18n").getResourceBundle();

            this.bus = this.getOwnerComponent().getEventBus();
            this.bus.subscribe("flexible", "setDetailPage", this.setDetailPage, this);
            this.getOwnerComponent().getEventBus().subscribe("tabs", "clear", this.clearAllTabs, this);

            this.oFlexibleColumnLayout = this.byId(ControlIds.Order.FLEX_BAR);
            if (isBackTrigger) {
                this.getView().getModel("SalesOrderEntryRes");
            }

            let oSearchField = this.byId(ControlIds.Order.SEARCH);
            if (oSearchField) {
                oSearchField.setValue(""); // clear search input
            }


        },

        /**
         * Route Matched based on Routing Name
         * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
         * @version 1.0.0
         * @since 10.02.2025
         * @fires _handleRouteMatched,createDynamicTabsForFreshOrRetest,_restoreSelectedMaterials
         * @author MM
         */

        _handleRouteMatched: async function (oEvent) {
            sRetestOrFresh = oEvent.getParameter('arguments').from;
            this._bKeepPage = false;
            let isFromPayment = this.getView().getModel("oGlobalModel").getProperty("/IsFromPayment");
            if (oEvent.getParameter("name") === Constant.Services) {

                let oRetestBtnModel = new JSONModel({
                    isReTestEditable: (sRetestOrFresh === Constant.TESTMODE.RETEST || isFromPayment) ? false : true,
                    isUpdateBtn: isFromPayment ? true : false
                });

                this.getView().setModel(oRetestBtnModel, "RetestBtnEnabled")
                this.getOwnerComponent().setModel(oRetestBtnModel, "ReTestBtnModel");

                let oModel = this.getOwnerComponent().getModel("plateModel");
                if (oModel) {
                    this.createDynamicTabsForFreshOrRetest();
                }
                await this._restoreSelectedMaterials();
            }
        },

        /**
         * Restore Selected Material after save to come back from payment
         * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
         * @version 1.0.0
         * @since 10.02.2025
         * @fires _restoreSelectedMaterials
         * @author MM
         */

        _restoreSelectedMaterials: function () {
            let oMaterialModel = this.getView().getModel("MaterialMasterModel");
            let oCardModel = this.getView().getModel("SalesOrderCardDataModel");
            let oGridList = this.byId(ControlIds.Order.GRID_LIST); // ID of your GridList control
            if (oMaterialModel && oCardModel) {
                let sPlateNo = oCardModel.getProperty("/PlateNo");
                let oPlateMaterials = oCardModel.getProperty("/PlateMaterials") || {};
                let aSelectedMaterials = oPlateMaterials[sPlateNo] || [];

                // Clone array to avoid direct mutation if needed
                let aAllMaterials = oMaterialModel.getProperty("/d/results") || [];

                // Update highlight for each material
                if (sRetestOrFresh === Constant.TESTMODE.RETEST) {
                    aAllMaterials.forEach((material, index) => {
                        const materialCode = material.MATERIALCODE;
                        const plateNum = material.PLATENUMBER;

                        // Strict match: both material code AND exact price
                        const isSelected = aSelectedMaterials.some(item =>
                            item.Material === materialCode &&
                            item.PlateNo === plateNum
                        );

                        material.Highlight = isSelected ? Constant.INFORMATION : Constant.NONE;
                        const oItem = oGridList.getItems()[index];
                        if (oItem) {
                            // Remove both classes first
                            oItem.removeStyleClass("material_selection");
                            oItem.removeStyleClass("serviceCard");

                            // Apply based on condition
                            if (isSelected) {
                                oItem.addStyleClass("material_selection");
                            } else {
                                oItem.addStyleClass("serviceCard");
                            }
                        }
                    });
                } else {
                    aAllMaterials.forEach((material, index) => {
                        const sMaterialCode = material.MATERIALCODE;
                        const sMaterialPrice = parseFloat(material.TOTALAMOUNTWITHVAT).toFixed(2);

                        // Strict match: both material code AND exact price
                        const isSelected = aSelectedMaterials.some(item =>
                            item.Material === sMaterialCode && parseFloat(item.Price).toFixed(2) === sMaterialPrice
                        );

                        material.Highlight = isSelected ? Constant.INFORMATION : Constant.NONE;

                        //  Add/Remove CSS classes on the GridListItem
                        const oItem = oGridList.getItems()[index];
                        if (oItem) {
                            // Remove both classes first
                            oItem.removeStyleClass("material_selection");
                            oItem.removeStyleClass("serviceCard");

                            // Apply based on condition
                            if (isSelected) {
                                oItem.addStyleClass("material_selection");
                            } else {
                                oItem.addStyleClass("serviceCard");
                            }
                        }
                    });
                }
                oMaterialModel.setProperty("/d/results", aAllMaterials);
                // Update cart count and items
                oCardModel.setProperty("/MyCartCount", aSelectedMaterials.length);
                oCardModel.setProperty("/MyCartItems", aSelectedMaterials);
            }
        },

        /**
         * Creating Dyanamic Icon Tabs based on add More Vehicle 
         * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
         * @version 1.0.0
         * @since 10.02.2025
         * @fires createDynamicTabsForFreshOrRetest,createTabsForFreshTest,createTabsForReTest
         * @author MM
         */

        createDynamicTabsForFreshOrRetest: async function () {
            var oGlobalModel = this.getView().getModel("oGlobalModel");
            const isPayment = oGlobalModel.getProperty("/IsFromPayment");
            const sDynamicInspType = oGlobalModel.getProperty("/DynamicInspectionType");
            const oIconTabBar = this.getView().byId(ControlIds.Order.TAB_BAR);
            const oSalesModel = this.getView().getModel("SalesOrderCardDataModel");
            const oPlateModel = this.getOwnerComponent().getModel("plateModel");
            const oPlateDataObject = this.getOwnerComponent().getModel("GetPlateDataModel").getData(); // object or single
            const aPlateDetailsFromAPI = Object.values(oPlateDataObject);

            if (!oPlateModel) return;

            let aPlates = oPlateModel.getProperty("/plates") || [];

            //  Use aPreviousData if coming from payment, else use API response
            const aActivePlateList = isPayment ? aPreviousData : aPlateDetailsFromAPI;

            aActivePlateList.forEach(oPlateDetailModel => {
                const sPlateNo = oPlateDetailModel?.plateNumber;

                //  Skip if plate number missing
                if (!sPlateNo) return;
                const sTabKey = `${sPlateNo}`;
                //  Store unique data in aPreviousData (only if not already present)
                const isAlreadyInPreviousData = aPreviousData.some(
                    item => item?.plateNumber === oPlateDetailModel?.plateNumber
                );
                if (!isAlreadyInPreviousData) {
                    aPreviousData.push(oPlateDetailModel);
                }

                // Set Sales Order model info
                oSalesModel.setProperty("/PlateCode", oPlateDetailModel.plateColorCode);
                oSalesModel.setProperty("/PlateCodeName", oPlateDetailModel.plateColorEnglish);
                oSalesModel.setProperty("/PlateNo", sPlateNo);

                let aDuplicates = aPlates.filter((v, i) => aPlates.indexOf(v) !== i);

                if (aDuplicates.length > 0) {
                    aPlates = [...new Set(aPlates)];

                    MessageToast.show(
                        this.oBundle.getText('salesOrder_messageToastalreadyaddedsameVehcile')
                    );
                    return;

                }

                // Check if tab already exists
                const bTabExists = oIconTabBar.getItems().some(item => item.getKey() === sTabKey);
                const isFromBack = oGlobalModel.getProperty("/isBackToOrder");
                const isBackToVehicle = this.getView().getModel("BackToSearchVehicleModel").getProperty("/isBackToVehicle");
                //  Tab creation logic
                if (!bTabExists || (isFromBack || isBackToVehicle)) {
                    const oNewTab = new IconTabFilter({
                        key: sTabKey,
                        text: sPlateNo,
                        icon: "sap-icon://car-rental"
                    });

                    // Add dynamic custom data
                    oNewTab.addCustomData(new sap.ui.core.CustomData({
                        key: "type",
                        value: sDynamicInspType // e.g. "paymentData" or "inspectionData"
                    }));

                    oIconTabBar.addItem(oNewTab);
                    this._getMaterialMaster();

                }
                // Track plate in plateModel
                if (!aPlates.includes(sTabKey)) {
                    aPlates.push(sTabKey);
                }

                // Auto-select current tab
                oIconTabBar.addEventDelegate({
                    onAfterRendering: function () {
                        oIconTabBar.setSelectedKey(sTabKey);
                    }
                });
            });
            if (isPayment) {
                this._getMaterialMaster();
            }
            // Final update to plateModel
            oPlateModel.setProperty("/plates", aPlates);
        },

        /**
         * Clear Tabs after Create Sales Order
         * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
         * @version 1.0.0
         * @since 10.02.2025
         * @fires clearAllTabs
         * @author MM
         */

        clearAllTabs: function () {
            const oIconTabBar = this.getView().byId(ControlIds.Order.TAB_BAR);
            const aTabs = oIconTabBar.getItems();

            // Keep the first tab (static) if needed, or remove all
            aTabs.forEach(tab => {
                if (tab.getKey() !== "staticTab") { // if you have a static tab
                    oIconTabBar.removeItem(tab);
                }
            });

            // Also clear plateModel
            const oPlateModel = this.getOwnerComponent().getModel("plateModel");
            const oPersistentVehicleModel = this.getOwnerComponent().getModel("PersistentVehicleDataModel");
            oPlateModel.setProperty("/plates", []);
            oPersistentVehicleModel.setProperty("/VehOrdInspDetailsStore", []);
        },

        /**
         * Tab Selection for Show More Vehcile Details based on Plate Number
         * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
         * @version 1.0.0
         * @since 10.02.2025
         * @fires onIconTabSelect,_getMaterialMaster
         * @author MM
         */


        onIconTabSelect: function (oEvent) {
            let sSelectedKey;
            let sType;
            if (oEvent) {
                // Case 1: Normal event trigger
                sSelectedKey = oEvent.getParameter("key");
                const oSelectedTab = oEvent.getParameter("item");
                sType = oSelectedTab.data("type");
                this.getView().getModel("oGlobalModel").setProperty("/SelectedModifedFlag", sSelectedKey)

            } else {
                // Case 2: Manual call after delete
                const oIconTabBar = this.byId(ControlIds.Order.TAB_BAR);
                sSelectedKey = oIconTabBar.getSelectedKey();

                // Get the actual tab control
                const oSelectedTab = oIconTabBar.getItems().find(tab => tab.getKey() === sSelectedKey);
                sType = oSelectedTab ? oSelectedTab.data("type") : null;
            }

            this.getView().getModel("oGlobalModel").setProperty("/DynamicInspectionType", sType);
            let oCardModel = this.getView().getModel("SalesOrderCardDataModel");
            let oPlateMaterials = oCardModel.getProperty("/PlateMaterials") || [];

            let aCurrentMaterials = oPlateMaterials[sSelectedKey] || [];

            let oGridList = this.byId(ControlIds.Order.GRID_LIST); // ID of your GridList control
            // Update current plate in the model
            oCardModel.setProperty("/PlateNo", sSelectedKey);

            // Loop through MaterialMasterModel and apply highlight
            let aAllMaterials = this.getView().getModel("MaterialMasterModel").getProperty("/d/results") || [];
            if (sRetestOrFresh === Constant.TESTMODE.RETEST) {
                aAllMaterials.forEach(material => {
                    material.Highlight = aCurrentMaterials.some(item => item.Material === material.MATERIALCODE && item.PlateNo === material.PLATENUMBER)
                        ? Constant.INFORMATION
                        : Constant.NONE;
                    const oItem = oGridList.getItems()[index];
                    if (oItem) {
                        // Remove both classes first
                        oItem.addStyleClass("material_selection");
                    }
                });
            } else {
                aAllMaterials.forEach((material, index) => {
                    const isSelected = aCurrentMaterials.some(item => item.Material === material.MATERIALCODE && item.Price === material.TOTALAMOUNTWITHVAT);
                    material.Highlight = isSelected ? Constant.INFORMATION : Constant.NONE;

                    const oItem = oGridList.getItems()[index];
                    if (oItem) {
                        // Remove existing classes to avoid overlap
                        oItem.removeStyleClass("material_selection");
                        oItem.removeStyleClass("serviceCard");

                        // Add the correct class based on selection
                        if (isSelected) {
                            oItem.addStyleClass("material_selection");
                        } else {
                            oItem.addStyleClass("serviceCard");
                        }
                    }
                });

            }

            this.getView().getModel("MaterialMasterModel").refresh();
            this.getView().getModel("SalesOrderCardDataModel").setProperty("/MyCartCount", aCurrentMaterials.length);
            this._getMaterialMaster();
        },

        /**
               * Creating Sales Order Based after confirm from Accessories Popup
               * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
               * @version 1.0.0
               * @since 10.02.2025
               * @fires onBtnPressCreateOrder,onBtnPressScanMaterial
               * @author MM
               */

        onBtnPressCreateOrder: function () {
            MessageBox.confirm(
                this.oBundle.getText("salesOrder_messageToastDoyouwanttoaddAccessories"), {
                icon: MessageBox.Icon.CONFIRM,
                title: this.oBundle.getText("commonmsgConfirmation"),
                class: "cl_Emphasizebtn",
                type: "Emphasized",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        this.onBtnPressScanMaterial();
                    } else {
                        this.onBtnPressSaveSalesOrder();

                    }
                }.bind(this)
            });
        },

        /**
       * Go to Back after click Exit Button
       * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
       * @version 1.0.0
       * @since 10.02.2025
       * @fires onBtnPressExit,clearAllTabs
       * @author MM
       */

        onBtnPressExit: function () {
            let oMatModel = this.getView().getModel("MaterialMasterModel");
            let oGlobalModelRes = this.getView().getModel("oGlobalModel");
            let oSalesOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
            oSalesOrderCardModel.setProperty("/MyCartCount", 0);
            oSalesOrderCardModel.setProperty("/MyCartItems", []);
            oSalesOrderCardModel.setProperty("/PlateNo", null);
            oSalesOrderCardModel.setProperty("/PlateMaterials", []);
            oSalesOrderCardModel.setProperty("/MaterialMasterModel", []);

            oGlobalModelRes.setProperty("/isAddMoreClicked", false);
            oGlobalModelRes.setProperty("/SelectedModifedFlag", "");
            oGlobalModelRes.setProperty("/IsFromPayment", false);

            oMatModel.setData([]);
            let oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo(Constant.SearchVehicle, false);
            this.clearAllTabs();
            this.getView().getModel('BackToSearchVehicleModel').setProperty("/isBackToVehicle", false);
        },

        /**
          * Open Fragment to Scanning EAN Number
          * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
          * @version 1.0.0
          * @since 10.02.2025
          * @fires onBtnPressScanMaterial
          * @author MM
        */

        onBtnPressScanMaterial: function () {
            if (!this.MaterialScan) {
                this.MaterialScan = sap.ui.xmlfragment("MaterialScan", "adnoc.vi.vehicleinspection.modone.fragment.view.MaterialScan", this);
                this.getView().addDependent(this.MaterialScan);
            }
            this.MaterialScan.open();
            this.getView().getModel("SalesOrderCardDataModel").setProperty("/MaterialNum", "");
            this._getAutoCompleteAccessories();
        },

        /**
          * Accept after enter Scanning EAN Number
          * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
          * @version 1.0.0
          * @since 10.02.2025
          * @fires onBtnPressAcceptMaterial,_getHighlightedMaterial
          * @author MM
        */

        onBtnPressAcceptMaterial: function (oEvent) {
            let oButton = oEvent.getSource();
            let sText = oButton.getText();

            let oScannedModel = this.getView().getModel("SalesOrderCardDataModel").getData();
            if (oScannedModel.MaterialNum === "") {
                MessageToast.show(this.oBundle.getText("salesOrder_NoMaterial"));
                return
            }
            this._getHighlightedMaterial(oScannedModel.MaterialNum, sText);
            this.MaterialScan.close();
        },

        /**
          * Search Material from Accessories Popup
          * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
          * @version 1.0.0
          * @since 10.02.2025
          * @fires onBtnPressSearchMaterial
          * @author MM
        */

        onBtnPressSearchMaterial: function (oEvent) {
            let oButton = oEvent.getSource();
            let sText = oButton.getText();

            let oScannedModel = this.getView().getModel("SalesOrderCardDataModel").getData();
            if (oScannedModel.MaterialNum === "") {
                MessageToast.show(this.oBundle.getText("salesOrder_NoMaterial"));
                return
            }
            this._getHighlightedMaterial(oScannedModel.MaterialNum, sText);
            this.MaterialScan.close();
        },

        /**
         * Close after enter Scanning EAN Number
         * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
         * @version 1.0.0
         * @since 10.02.2025
         * @fires onBtnPressCloseMaterialScan
         * @author MM
        */

        onBtnPressCloseMaterialScan: function () {
            this.MaterialScan.close();
            this.getView().getModel("SalesOrderCardDataModel").setProperty("/MaterialNum", "");
        },

        /**
           * GET Scanned enter Scanning EAN Number
           * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
           * @version 1.0.0
           * @since 10.02.2025
           * @fires getScanSuccessed,_getHighlightedMaterial
           * @author MM
        */

        getScanSuccessed: function (oEvent) {

            if (oEvent.getParameter("cancelled")) {
                MessageToast.show(this.oBundle.getText("salesOrder_messageToastScancancelled"), { duration: 1000 });
            } else {
                if (oEvent.getParameter("text")) {
                    let scannedvalue = oEvent.getParameter("text");
                    this.getView().getModel("SalesOrderCardDataModel").setProperty("/MaterialNum", scannedvalue);
                    this._getHighlightedMaterial(scannedvalue, this.oBundle.getText("dialog_AddAccessories"));
                } else {
                    oScanResultText.setText('');
                }
            }
        },

        /**
       * GET Error Scanning EAN Number
       * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
       * @version 1.0.0
       * @since 10.02.2025
       * @fires getScanError
       * @author MM
       */

        getScanError: function (oEvent) {
            MessageToast.show(this.oBundle.getText("salesOrder_messageToastScancancelled ") + oEvent, { duration: 1000 });
        },

        /**
       * GET Accessories for adding into cart
       * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
       * @version 1.0.0
       * @since 10.02.2025
       * @fires _getMateralForAccessories,getFormattedTitle,_getAccessoriesData
       * @author MM
       */

        _getMateralForAccessories: async function (sEANNum, sText) {
            const sDynamicInspType = this.getView().getModel("oGlobalModel").getProperty("/DynamicInspectionType");
            this.getFormattedTitle(sDynamicInspType);

            let oPayload = this._buildCommonPayload(Constant.TESTMODE.ACCESSORIES);
            // Call API
            await this.createNewModelUsingAPI(
                Constant.POST,
                `/getMaterialDetails`,
                oPayload,
                'AccessoriesModel'
            );

            const oSalesOrderMaterial = this.getApiResponseObject();
            if (oSalesOrderMaterial.success) {

                let oModel = this.getView().getModel('AccessoriesModel');
                let oData = oModel.getData();
                let oFilteredAcces = oData.results[0].aFilteredMaterials.filter(item => (item.EANNO === sEANNum || item.MATERIALCODE === sEANNum));
                if (oFilteredAcces.length == 0) {
                    MessageToast.show(this.oBundle.getText("salesOrder_NoEANFOUND"));
                    return
                }
                this._getAccessoriesData(oFilteredAcces, sText);
            } else {
                let oResponse = JSON.parse(oSalesOrderMaterial.object.responseText);
                MessageBox.error(oResponse.error?.message?.value);
                return;
            }
        },

        /**
          * Show selected material or assocceries after scanned or enter number
          * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
          * @version 1.0.0
          * @since 10.02.2025
          * @fires _getHighlightedMaterial,_getAccessoriesData,_getMateralForAccessories
          * @author MM
        */

        _getHighlightedMaterial: function (scannedvalue, sText) {

            const oGridList = this.byId(ControlIds.Order.GRID_LIST);
            const oItems = oGridList.getItems();
            let bFound = false;
            const sDynamicInspType = this.getView().getModel("oGlobalModel").getProperty("/DynamicInspectionType");

            let aFreshModes = [
                Constant.TESTMODE.FRESHTEST,
                Constant.TESTMODE.PERMIT,
                Constant.TESTMODE.TRANSFER,
                Constant.TESTMODE.CHANGEINFO,
                Constant.TESTMODE.RETEST
            ];

            if (aFreshModes.includes(sDynamicInspType) && sText === this.oBundle.getText("dialog_AddAccessories")) {
                this._getMateralForAccessories(scannedvalue, sText);
                bFound = true;
            }
            else {
                for (let oItem of oItems) {
                    const oContext = oItem.getBindingContext("MaterialMasterModel");
                    if (oContext) {
                        const oData = oContext.getObject();
                        if (oData.EANNO === scannedvalue || oData.MATERIALCODE === scannedvalue) {

                            const sDynamicInspType = this.getView().getModel("oGlobalModel").getProperty("/DynamicInspectionType");
                            this.getFormattedTitle(sDynamicInspType);
                            this._getAccessoriesData(oItem, sText);
                            // Auto-select matching tab
                            this.getView().getModel("GetPlateDataModel").setProperty("/plateNumber", oData.PLATENO);

                            bFound = true;
                            break;
                        }
                    }
                }

                if (!bFound) {
                    MessageBox.warning(this.oBundle.getText("salesOrder_messageToastNomaterialfoundwithEAN") + scannedvalue);
                }
            }

            if (!bFound) {
                MessageBox.warning(this.oBundle.getText("salesOrder_messageToastNomaterialfoundwithEAN") + scannedvalue);
            }
        },

        /**
      * Get assocceries after scanned or enter number
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires _getAccessoriesData,_getDataForCreateOrder
      * @author MM
      */

        _getAccessoriesData: function (oItem, sText) {

            const sDynamicInspType = this.getView().getModel("oGlobalModel").getProperty("/DynamicInspectionType");
            var oSalesOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
            let oListObject;

            let aFreshModes = [
                Constant.TESTMODE.FRESHTEST,
                Constant.TESTMODE.PERMIT,
                Constant.TESTMODE.TRANSFER,
                Constant.TESTMODE.CHANGEINFO,
                Constant.TESTMODE.RETEST
            ]; if (aFreshModes.includes(sDynamicInspType) && sText === this.oBundle.getText("dialog_AddAccessories")) {
                oListObject = oItem[0];
            } else {
                oListObject = oItem.getBindingContext("MaterialMasterModel").getObject();
            }


            let aMaterialData = oSalesOrderCardModel.getProperty("/MyCartItems");

            let sPlateNo = oSalesOrderCardModel.getProperty("/PlateNo");
            let sPlateCodeName = oSalesOrderCardModel.getProperty("/PlateCodeName");

            //let oModel = this.getView().getModel("SalesOrderCardDataModel");
            let oPlateMaterials = oSalesOrderCardModel.getProperty("/PlateMaterials") || {};

            let aSelectedmaterial = oPlateMaterials.filter(function (e) {
                return e.Material === oListObject.MATERIALCODE && e.Price === oListObject.TOTALAMOUNTWITHVAT;
            });
            if (aSelectedmaterial.length === 0) {
                if (aFreshModes.includes(sDynamicInspType) && sText === this.oBundle.getText("dialog_AddAccessories")) {
                    oListObject = oItem[0];
                    oListObject.Highlight = Constant.INFORMATION;
                } else {
                    let oContext = oItem.getBindingContext("MaterialMasterModel");
                    oContext.getModel().setProperty(oContext.getPath() + "/Highlight", Constant.INFORMATION);
                }


                let iAsseccQty = "";
                if (oListObject.MATERIALTYPE) {
                    iAsseccQty = Constant.QTY1;
                }
                let item = "";
                if (aMaterialData.length === 0) {
                    item = Constant.QTY10;
                } else {
                    item = parseInt(aMaterialData[aMaterialData.length - 1].OrderLineNo) + 10;
                }

                let oAccessObj = {
                    "vehicleOrderCoupans": [],
                    "DiscountAmount": oListObject.DISCOUNTAMOUNT,
                    "SubTotalAfterDis": oListObject.AFTERDISCOUNT,
                    "Material": oListObject.MATERIALCODE,
                    "CondType": oListObject.CONDITIONTYPE,
                    "ProductHierarchy": oListObject.PRODUCTHIERARCHY,
                    "ServiceName": oListObject.MATERIALENGLISHDESCRIPTION,
                    "ServiceArabicName": oListObject.MATERIALARABICDESCRIPTION,
                    "Price": parseFloat(oListObject.TOTALAMOUNTWITHVAT).toFixed(2),
                    "TotalVat": parseFloat(oListObject.TOTALVAT).toFixed(2),
                    "TotalWithOutVAT": parseFloat(oListObject.TOTALWITHOUTVAT).toFixed(2),
                    "ContCurrency": oListObject.CONTCURRENCY,
                    "MaterialGroup": oListObject.MATERIALGROUP,
                    "MaterialType": oListObject.MATERIALTYPE,
                    "MaterialUUID": oListObject.MATERIALUUID,
                    "PlantCode": oListObject.PLANTCODE,
                    "SalesOrganization": oListObject.SALESORGANIZATION,
                    "ProfitCenter": oListObject.PROFITCENTER,
                    "VATPercentage": oListObject.VATPERCENT,
                    "VatCode": oListObject.TAXCODE,
                    "VAT": parseFloat(oListObject.TOTALVAT).toFixed(2),
                    "TotalAmount": parseFloat(oListObject.TOTALAMOUNTWITHVAT).toFixed(2),
                    "Qty": iAsseccQty,
                    "OrderLineNo": item,
                    "PlateNo": sPlateNo,
                    "PlateCodeName": sPlateCodeName,
                    "to_ConditionType": oListObject.TO_CONDITIONTYPE,
                    "vehOrdInspLinesTestChars": oListObject.MATERIALCHARACTERISTIC || []
                };

                let bDuplicateAccess = aMaterialData.some(function (oItem) {
                    return oItem.Material === oAccessObj.Material && oItem.PlateNo === oAccessObj.PlateNo;
                });

                if (bDuplicateAccess) {
                    MessageBox.warning(this.oBundle.getText("accessories_doubleSelectMaterialMsg", [oAccessObj.Material]));
                    return; // IMPORTANT: Stop the function here so the duplicate is not added
                }

                aMaterialData.push(oAccessObj);

                if (!aFreshModes.includes(sDynamicInspType) ||
                    sText !== this.oBundle.getText("dialog_AddAccessories")) {
                    oItem.addStyleClass("material_selection");
                    oItem.removeStyleClass("serviceCard");
                }

                oPlateMaterials[sPlateNo] = aMaterialData;
                oSalesOrderCardModel.setProperty("/PlateMaterials", oPlateMaterials);
                oSalesOrderCardModel.setProperty("/MyCartItems", aMaterialData);
                oSalesOrderCardModel.setProperty("/MyCartCount", aMaterialData.length);

                if (aMaterialData.length !== 0) {

                    let iSum = aMaterialData.map(o => o.TotalAmount).reduce((a, c) => parseFloat(a) + parseFloat(c));
                    let iDiscountAmount = aMaterialData.map(o => o.DiscountAmount).reduce((a, c) => parseFloat(a) + parseFloat(c));
                    let iSubTotalAfterDis = aMaterialData.map(o => o.SubTotalAfterDis).reduce((a, c) => parseFloat(a) + parseFloat(c));
                    let iVat = aMaterialData.map(o => o.VAT).reduce((a, c) => parseFloat(a) + parseFloat(c));

                    oSalesOrderCardModel.setProperty("/SubTotalAfterDis", parseFloat(iSubTotalAfterDis).toFixed(2));
                    oSalesOrderCardModel.setProperty("/VatAmount", parseFloat(iVat).toFixed(2));
                    oSalesOrderCardModel.setProperty("/DiscountAmount", parseFloat(iDiscountAmount).toFixed(2));
                    oSalesOrderCardModel.setProperty("/TotalAmount", parseFloat(iSum).toFixed(2));

                    // Force UI update without setTimeout
                    sap.ui.getCore().applyChanges();
                } else {
                    oSalesOrderCardModel.setProperty("/SubTotalAfterDis", "0.00");
                    oSalesOrderCardModel.setProperty("/VatAmount", "0.00");
                    oSalesOrderCardModel.setProperty("/DiscountAmount", "0.00");
                    oSalesOrderCardModel.setProperty("/TotalAmount", "0.00");
                }

            } else {
                MessageToast.show(this.oBundle.getText("salesOrder_messageToastThismaterialisalreadyselected"));
            }
            this._getDataForCreateOrder();

        },


        /**
       * Material Selection for Select Services or Accessories 
       * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
       * @version 1.0.0
       * @since 10.02.2025
       * @fires onBtnPressSelectMaterial,_getDataForCreateOrder
       * @author MM
       */

        onBtnPressSelectMaterial: function (oEventOrObject, aFindUniqueMaterial, isModified) {
            let oListObject;
            let oListItem;
            const oView = this.getView();
            const oSalesOrderCardModel = oView.getModel("SalesOrderCardDataModel");
            const oMaterialModel = oView.getModel("MaterialMasterModel");
            const oGridList = this.byId(ControlIds.Order.GRID_LIST);
            const bIsManual = oEventOrObject != null ? typeof oEventOrObject.getSource === "function" : null;

            if (bIsManual) {
                // Manual selection from UI click
                oListItem = oEventOrObject.getSource();
                oListObject = oListItem.getBindingContext("MaterialMasterModel").getObject();
            } else {
                // Programmatic call (Re-Test / auto select)
                oListObject = oEventOrObject;
            }

            // Auto-highlight logic (merged from selectModifiedMaterials)
            if (isModified && Array.isArray(aFindUniqueMaterial) && oGridList) {
                oGridList.getItems().forEach((oItem) => {
                    const oCtx = oItem.getBindingContext("MaterialMasterModel");
                    if (!oCtx) return;

                    const oMaterial = oCtx.getObject();
                    const bIsModified = aFindUniqueMaterial.some((m) =>
                        m.MATERIALCODE === oMaterial.MATERIALCODE
                    );

                    if (bIsModified) {
                        oItem.addStyleClass("material_selection");
                        oItem.removeStyleClass("serviceCard");

                        // Call onBtnPressSelectMaterial programmatically for each matched material
                        this.onBtnPressSelectMaterial(oMaterial);
                    } else {
                        oItem.removeStyleClass("material_selection");
                    }
                });

                // Return early if only auto-selection was intended
                if (!bIsManual) return;
            }

            // Continue with your existing selection logic
            let sPlateNo = oSalesOrderCardModel.getProperty("/PlateNo");
            let sPlateCodeName = oSalesOrderCardModel.getProperty("/PlateCodeName");
            let oPlateMaterials = oSalesOrderCardModel.getProperty("/PlateMaterials") || {};
            let aMaterialData = oPlateMaterials[sPlateNo] || [];
            let bAlreadySelected = aMaterialData.some(e => e.Material === oListObject.MATERIALCODE && e.Price === oListObject.TOTALAMOUNTWITHVAT);

            if (oListObject.Highlight === Constant.NONE) {
                if (!bAlreadySelected) {
                    oListObject.Highlight = Constant.INFORMATION;
                    oMaterialModel.refresh(true);

                    let sQty = oListObject.MATERIALTYPE ? Constant.QTY1 : "";
                    let item = aMaterialData.length === 0
                        ? Constant.QTY10
                        : (parseInt(aMaterialData[aMaterialData.length - 1].OrderLineNo) + 10).toString();

                    let oServiceObj = {
                        "vehicleOrderCoupans": [],
                        "DiscountAmount": oListObject.DISCOUNTAMOUNT,
                        "SubTotalAfterDis": oListObject.AFTERDISCOUNT,
                        "Material": oListObject.MATERIALCODE,
                        "CondType": oListObject.CONDITIONTYPE,
                        "ProductHierarchy": oListObject.PRODUCTHIERARCHY,
                        "ServiceName": oListObject.MATERIALENGLISHDESCRIPTION,
                        "ServiceArabicName": oListObject.MATERIALARABICDESCRIPTION,
                        "Price": parseFloat(oListObject.TOTALAMOUNTWITHVAT).toFixed(2),
                        "TotalVat": parseFloat(oListObject.TOTALVAT).toFixed(2),
                        "TotalWithOutVAT": parseFloat(oListObject.TOTALWITHOUTVAT).toFixed(2),
                        "ContCurrency": oListObject.CONTCURRENCY,
                        "MaterialGroup": oListObject.MATERIALGROUP,
                        "MaterialType": oListObject.MATERIALTYPE,
                        "MaterialUUID": oListObject.MATERIALUUID,
                        "PlantCode": oListObject.PLANTCODE,
                        "SalesOrganization": oListObject.SALESORGANIZATION,
                        "ProfitCenter": oListObject.PROFITCENTER,
                        "VATPercentage": oListObject.VATPERCENT,
                        "VatCode": oListObject.TAXCODE,
                        "VAT": parseFloat(oListObject.TOTALVAT).toFixed(2),
                        "TotalAmount": parseFloat(oListObject.TOTALAMOUNTWITHVAT).toFixed(2),
                        "Qty": sQty,
                        "OrderLineNo": item,
                        "PlateNo": sPlateNo,
                        "PlateCodeName": sPlateCodeName,
                        "vehOrdInspLinesTestChars": oListObject.MATERIALCHARACTERISTIC || [],
                        "to_ConditionType": oListObject.TO_CONDITIONTYPE
                    };

                    aMaterialData.push(oServiceObj);
                    if (bIsManual) {
                        oEventOrObject.getSource().addStyleClass("material_selection");
                        oEventOrObject.getSource().removeStyleClass("serviceCard");
                    }
                }
            } else {
                // Unselect logic (same as before)
                let oContext = oEventOrObject.getSource().getBindingContext("MaterialMasterModel");
                oContext.getModel().setProperty(oContext.getPath() + "/Highlight", Constant.NONE);
                let index = aMaterialData.findIndex(E => E.Material === oListObject.MATERIALCODE);
                if (index !== -1) {
                    aMaterialData.splice(index, 1);
                }

                let oPersistentModel = this.getOwnerComponent().getModel("PersistentVehicleDataModel");
                let aVehOrdInspDetails = oPersistentModel.getProperty("/VehOrdInspDetailsStore") || [];
                let iVehicleIndex = aVehOrdInspDetails.findIndex(v => v.plateNumber === sPlateNo);

                if (iVehicleIndex !== -1) {
                    let oVehicle = aVehOrdInspDetails[iVehicleIndex];
                    let aLines = oVehicle.vehOrdInspLines || [];
                    let iLineIndex = aLines.findIndex(e => e.materialCode === oListObject.MATERIALCODE);
                    if (iLineIndex !== -1) aLines.splice(iLineIndex, 1);
                    oVehicle.vehOrdInspLines = aLines;
                    aVehOrdInspDetails[iVehicleIndex] = oVehicle;
                    oPersistentModel.setProperty("/VehOrdInspDetailsStore", aVehOrdInspDetails);
                }

                if (bIsManual) {
                    oEventOrObject.getSource().addStyleClass("serviceCard");
                    oEventOrObject.getSource().removeStyleClass("material_selection");
                }
            }

            // Update models (same as before)
            oPlateMaterials[sPlateNo] = aMaterialData;
            oSalesOrderCardModel.setProperty("/PlateMaterials", oPlateMaterials);
            oSalesOrderCardModel.setProperty("/MyCartItems", Object.values(oPlateMaterials).flat());
            oSalesOrderCardModel.setProperty("/MyCartCount", aMaterialData.length);

            if (aMaterialData.length !== 0) {
                let iTotalAmt = aMaterialData.map(o => o.TotalAmount).reduce((a, c) => parseFloat(a) + parseFloat(c));
                let iVat = aMaterialData.map(o => o.VAT).reduce((a, c) => parseFloat(a) + parseFloat(c));
                let iTotalDiscount = aMaterialData.map(o => o.DiscountAmount).reduce((a, c) => parseFloat(a) + parseFloat(c));
                let iSubTotalAfterDis = aMaterialData.map(o => o.SubTotalAfterDis).reduce((a, c) => parseFloat(a) + parseFloat(c));
                setTimeout(() => {
                    oSalesOrderCardModel.setProperty("/SubTotalAfterDis", parseFloat(iSubTotalAfterDis).toFixed(2));
                    oSalesOrderCardModel.setProperty("/DiscountAmount", parseFloat(iTotalDiscount).toFixed(2));
                    oSalesOrderCardModel.setProperty("/VatAmount", parseFloat(iVat).toFixed(2));
                    oSalesOrderCardModel.setProperty("/TotalAmount", parseFloat(iTotalAmt).toFixed(2));
                }, 300);
            } else {
                oSalesOrderCardModel.setProperty("/SubTotalAfterDis", "0.00");
                oSalesOrderCardModel.setProperty("/DiscountAmount", "0.00");
                oSalesOrderCardModel.setProperty("/VatAmount", "0.00");
                oSalesOrderCardModel.setProperty("/TotalAmount", "0.00");
            }

            this._getDataForCreateOrder();
        },

        /**
       * Back to Home Screen
       * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
       * @version 1.0.0
       * @since 10.02.2025
       * @fires onBtnPressAddVehicle
       * @author MM
       */

        onBtnPressAddVehicle: function (oEvent) {
            if (oEvent.getSource()) {
                this.getView().getModel("oGlobalModel").setProperty("/isAddMoreClicked", true);
            } else {
                this.getView().getModel("oGlobalModel").setProperty("/isAddMoreClicked", false);
            }
            this._bKeepPage = true;
            let oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo(Constant.SearchVehicle, false);
            this.getView().getModel('BackToSearchVehicleModel').setProperty("/isBackToVehicle", false);
        },

        /**
      * Using for Flexible Page
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires handleNavigateToMidColumnPress
      * @author MM
      */

        handleNavigateToMidColumnPress: async function () {
            let oSalesOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
            let oCardData = oSalesOrderCardModel.getData();
            let oGlobalModel = this.getView().getModel("oGlobalModel");
            let sFiltredData = aPreviousData.filter((item => oCardData.PlateNo === item.plateNumber));

            oSalesOrderCardModel.setProperty("/PlateCode", sFiltredData[0].plateColorCode);
            oSalesOrderCardModel.setProperty("/PlateCodeName", sFiltredData[0].plateColorEnglish);
            oGlobalModel.setProperty("/PlateSource", sFiltredData[0].plateSourceEnglish);
            oGlobalModel.setProperty("/PlateKind", sFiltredData[0].plateKindCode);
            oGlobalModel.setProperty("/VehicleType", sFiltredData[0].plateTypeCode);
            oGlobalModel.setProperty("/VehicleYear", sFiltredData[0].registrationYear);
            this.setDetailPage(sFiltredData);
        },

        /**
      * Using for Flexible Page to show vehcile details
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires setDetailPage
      * @author MM
      */

        // Lazy loader for the mid page - only on demand (when the user clicks)
        setDetailPage: function (oFilterData) {
            this.getLoadView({
                id: "servicewView",
                viewName: "adnoc.vi.vehicleinspection.modone.view.VehicleDetails"
            }).then(function (detailView) {

                // **Ensure the model exists before adding to FCL**
                if (oFilterData.length > Constant.ArrayZeroLength) {
                    let aFilteredData = oFilterData[0]
                    // **Create new model and bind data**
                    let oDetailModel = new JSONModel({
                        ChassisNo: aFilteredData.chasisNumber || "",
                        EngineNo: aFilteredData.engineNumber || "",
                        PlateSource: aFilteredData.plateSourceEnglish || "",
                        ModelEnglishDesc: aFilteredData.modelEnglish || "",
                        Manufacturer: aFilteredData.manfacturerEnglish || "",
                        GearType: aFilteredData.gearTypeEnglish || "",
                        InitRegyear: aFilteredData.registrationYear || "",
                        FuelType: aFilteredData.fuelTypeEnglish || "",
                        SteeringSide: aFilteredData.steeringSideEnglish || "",
                        MFGYear: aFilteredData.manufacturingYear || "",
                        HP: aFilteredData.horsePower || "",
                        BodyColor: aFilteredData.bodyColorEnglish || "",
                        Type: aFilteredData.typeEnglish || "",
                        RegExpYear: aFilteredData.registrationExpiryDate || "",
                        PlateNo: aFilteredData.plateNumber || "",
                        PlateCode: aFilteredData.plateColorEnglish || "",
                        SR: aFilteredData.SR || "",
                        TotalAmount: Constant.ArrayZeroLength,
                        VatAmount: Constant.ArrayZeroLength
                    });

                    detailView.setModel(oDetailModel, "VehicleDetailModel");

                } else {
                    MessageBox.warning(this.oBundle.getText("salesOrder_messageToastPleaseSearchVehicleFirst"));
                    return;
                }

                // **Add View to FlexibleColumnLayout**
                this.oFlexibleColumnLayout.addMidColumnPage(detailView);
                this.oFlexibleColumnLayout.setLayout(LayoutType.TwoColumnsBeginExpanded);

            }.bind(this));
        },

        /**
      * Using for Flexible Page to show vehcile details
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires getLoadView
      * @author MM
      */
        // Helper function to manage the lazy loading of views
        getLoadView: function (options) {
            let mViews = this._mViews = this._mViews || Object.create(null);
            if (!mViews[options.id]) {
                mViews[options.id] = this.getOwnerComponent().runAsOwner(function () {
                    return XMLView.create(options);
                });
            }
            return mViews[options.id];
        },

        /**
          * Using for Flexible Page to show vehcile details
          * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
          * @version 1.0.0
          * @since 10.02.2025
          * @fires onExit
          * @author MM
        */

        onExit: function () {
            this.bus.unsubscribe("flexible", "setDetailPage", this.setDetailPage, this);
        },

        /**
      * Get Material Items based on API Response 
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires _getMaterialMaster
      * @author MM
      */

        _getMaterialMaster: async function () {
            var oGlobalModel = this.getView().getModel("oGlobalModel")
            var oSalesOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
            var oPlateMaterials = oSalesOrderCardModel.getProperty("/PlateMaterials") || [];
            let oReTestModel = this.getOwnerComponent().getModel("ReTestForOrderModel");
            const sDynamicInspType = oGlobalModel.getProperty("/DynamicInspectionType");
            let isPayment = oGlobalModel.getProperty("/IsFromPayment");

            const sModifiedFlag = oGlobalModel.getProperty("/SelectedModifedFlag");
            this.getFormattedTitle(sDynamicInspType);
            let dCurrentDate = new Date();
            let areTestFiltered = [];

            let aFreshModes = [
                Constant.TESTMODE.FRESHTEST,
                Constant.TESTMODE.PERMIT,
                Constant.TESTMODE.TRANSFER,
                Constant.TESTMODE.ACCESSORIES,
                Constant.TESTMODE.CHANGEINFO,
                Constant.TESTMODE.ALLSERVICES
            ];

            // Build re-test filter if applicable
            if (sRetestOrFresh === Constant.TESTMODE.RETEST) {
                areTestFiltered = oReTestModel.map(item => {
                    delete item.testFlag;
                    return {
                        plateNumber: item.plateNumber,
                        orderDate: item.orderDate,
                        plateColor: item.plateColorEnglish,
                        plateKind: item.plateKindEnglish,
                        mobileNo: item.mobileNo,
                        plateSource: item.plateSourceEnglish,
                        serviceCode: item.serviceCode,
                        serviceName: item.serviceName,
                        maxTestEndDate: item.maxTestEndDate,
                        servicerequestNo: item.serviceRequestNo
                    };
                });
            }

            // Build common base payload
            const sFormattedDate = Formatter.getDateFromatIn_yyyyMMdd(dCurrentDate);
            const sTime = Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(dCurrentDate).split(" ")[1];

            let oPayloadBase = {
                sCurDate: sFormattedDate,
                sPlateSource: oGlobalModel.getProperty("/PlateSource"),
                sVehicleType: oGlobalModel.getProperty("/VehicleType"),
                sVehicleYear: oGlobalModel.getProperty("/VehicleYear"),
                sPlantCode: oGlobalModel.getProperty("/PlantCode"),
                sPlateNumber: oSalesOrderCardModel.getProperty("/PlateNo"),
                sDstributionChannel: oGlobalModel.getProperty("/SalesArea/0/distributionChannel"),
                sSalesOrganization: oGlobalModel.getProperty("/SalesOrganization"),
                sRegion: oGlobalModel.getProperty("/RegionCode"),
                sListType: oGlobalModel.getProperty("/laneTypeCode"),
                sFromTime: sTime,
                sToTime: sTime
            };

            if (isPayment) {
                oGlobalModel.setProperty("/FormattedTitle", Constant.AllService);
            }


            // Extend base payload depending on mode
            let oPayload = {
                ...oPayloadBase,
                sTestType: isPayment
                    ? Constant.TESTMODE.ALLSERVICES
                    : (aFreshModes.includes(sRetestOrFresh)
                        ? sDynamicInspType
                        : Constant.TESTMODELPAYLOAD.RETEST),
                oFilter: aFreshModes.includes(sRetestOrFresh) ? [] : areTestFiltered
            };

            // Call API
            await this.createNewModelUsingAPI(
                Constant.POST,
                `/getMaterialDetails`,
                oPayload,
                'MaterialMasterModel'
            );

            const oSalesOrderMaterial = this.getApiResponseObject();
            if (oSalesOrderMaterial.success) {
                let oModel = this.getView().getModel('MaterialMasterModel');
                this.getOwnerComponent().setModel(oModel, "MaterialMasterForPaymentModel");
                let oData = oModel.getData();

                let sPlateNo = oSalesOrderCardModel.getProperty("/PlateNo");
                const selectedMatCodes = new Set(oPlateMaterials.map(m => m.Material));
                const aModifiedRes = oData.results[0].aModifiedMaterial;
                const updatedArray = oData.results[0].aFilteredMaterials.map(item => ({
                    ...item,
                    Highlight: selectedMatCodes.has(item.MATERIALCODE) && item.PLATENUMBER === sPlateNo
                        ? Constant.INFORMATION
                        : Constant.NONE
                }));

                let aFindUniqueMaterial = [];
                if (aModifiedRes.length > Constant.ArrayZeroLength) {
                    aFindUniqueMaterial = updatedArray.filter((item => item.MATERIALCODE === aModifiedRes[0].MATERIALCODE));
                }

                this._aOriginalMaterialData = updatedArray.map(i => ({ ...i }));
                oModel.setData({ d: { results: updatedArray } });

                if (sRetestOrFresh === Constant.TESTMODE.RETEST) {
                    this.autoSelectReTestMaterials();
                }

                if (aFindUniqueMaterial.length > Constant.ArrayZeroLength && sModifiedFlag == "" && !isPayment) {
                    MessageBox.confirm(
                        this.oBundle.getText("salesOrder_ModifiedMaterial"), {
                        icon: MessageBox.Icon.INFORMATION,
                        title: this.oBundle.getText("commonmsgConfirmation"),
                        class: "sapUiSizeCompact",
                        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        onClose: function (oAction) {
                            if (oAction === MessageBox.Action.YES) {
                                this.onBtnPressSelectMaterial(null, aFindUniqueMaterial, true);
                            }
                        }.bind(this)
                    });

                }
                this._restoreSelectedMaterials();
            } else {
                let oResponse = JSON.parse(oSalesOrderMaterial.object.responseText);
                MessageBox.error(oResponse.error?.message?.value);
                return;
            }
        },

        /**
        * Get Title based on Inspection Selection
        * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
        * @version 1.0.0
        * @since 10.02.2025
        * @fires getFormattedTitle
        * @author MM
        */

        getFormattedTitle: function (sDynamicInspType) {

            // Step 1: Replace underscores with space
            let sFormatted = sDynamicInspType.replace(/_/g, " ")
                // Step 2: Insert space between lowercase-uppercase (camelCase)
                .replace(/([a-z])([A-Z])/g, "$1 $2")
                // Step 3: Insert space between consecutive uppercase groups
                .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
                // Step 4: Make everything proper case
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(" ");

            const corrections = {
                "Changeinfo": Constant.ChangeInfo,
                "Allservices": Constant.AllService
            };

            if (corrections[sFormatted]) {
                sFormatted = corrections[sFormatted];
            }

            this.getView().getModel("oGlobalModel").setProperty("/FormattedTitle", sFormatted);

        },

        /**
      * Creating Payload for Save Sales Order 
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires _getDataForCreateOrder,_getCalculatedValue
      * @author MM
      */

        _getDataForCreateOrder: function () {
            let oReTestorFreshTestData
            this._getCalculatedValue();

            if (sRetestOrFresh === Constant.TESTMODE.RETEST) {
                oReTestorFreshTestData = this.getOwnerComponent().getModel("ReTestForOrderModel");
                oReTestorFreshTestData["IsReTest"] = true;
            } else {
                oReTestorFreshTestData = this.getOwnerComponent().getModel("FreshTestForOrderModel").getData().results;
                oReTestorFreshTestData["IsReTest"] = false;
            }
            var oGlobalModel = this.getView().getModel("oGlobalModel");
            var oMaterialModel = this.getView().getModel("SalesOrderCardDataModel");
            const oSaveModel = this.getView().getModel("SalesOrderEntryRes");

            const oPersistentModel = this.getOwnerComponent().getModel("PersistentVehicleDataModel");
            const oPlateMaterialData = oMaterialModel.getProperty("/PlateMaterials") || {};
            let aVehOrdInspDetails = oPersistentModel.getProperty("/VehOrdInspDetailsStore") || [];

            var oEmployeeData = Formatter.onLoadGetDataInSessionStorage('BusinessData');

            oReTestorFreshTestData.forEach((vehicleData, index) => {
                const sPlateNo = oMaterialModel.getProperty("/PlateNo");
                if (!sPlateNo) return;

                const aServiceItems = oPlateMaterialData[sPlateNo] || [];
                if (!aServiceItems.length) {
                    return;
                }

                const sVehicleUUID = oReTestorFreshTestData[index].vehicleMastersUUID;

                // Find existing vehicle in array
                let oExistingVehicle = aVehOrdInspDetails.find(v => v.plateNumber === sPlateNo);
                let vehOrdInspLines = oExistingVehicle ? oExistingVehicle.vehOrdInspLines || [] : [];

                aServiceItems.forEach(serviceItem => {
                    const alreadyExists = vehOrdInspLines.some(item => item.materialCode === serviceItem.Material);
                    if (alreadyExists) return;

                    const iUnitPrice = parseFloat(serviceItem.Price || 0);
                    const iTotalWithOutVAT = parseFloat(serviceItem.TotalWithOutVAT || 0);
                    const iVat = parseFloat(serviceItem.TotalVat || 0);
                    const sTotalAmount = parseFloat(serviceItem.TotalAmount || 0);
                    const aCharVal = (serviceItem.vehOrdInspLinesTestChars || []).filter(item =>
                        item.INTERNALCHARNO === Constant.TESTTYPE.TEST_TYPE
                    );

                    const sInspectionType = aCharVal.length ? aCharVal[0].CHARVALUE || null : null;

                    const aVehicleOrderPricing = (serviceItem.to_ConditionType || []).map(condition => ({
                        condType: condition.CONDITIONTYPE,
                        condValue: parseFloat(condition.PRICE || 0)
                    }));

                    const aTestChars = (serviceItem.vehOrdInspLinesTestChars || []).flatMap(testItem => {
                        if (testItem.INTERNALCHARNO === Constant.TESTTYPE.MAHA) {
                            return [
                                {
                                    testInspectedBy: oGlobalModel.getProperty("/EmployeeData/empNameEnglish"),
                                    testInspectedByCode: oGlobalModel.getProperty("/EmployeeData/empCode"),
                                    testInspectionEndDate: null,
                                    testInspectionStartDate: null,
                                    testStatus: Constant.STATUS.OPEN,
                                    applicableTestName: Constant.TESTTYPE.ES_IN
                                },
                                {
                                    testInspectedBy: oGlobalModel.getProperty("/EmployeeData/empNameEnglish"),
                                    testInspectedByCode: oGlobalModel.getProperty("/EmployeeData/empCode"),
                                    testInspectionEndDate: null,
                                    testInspectionStartDate: null,
                                    testStatus: Constant.STATUS.OPEN,
                                    applicableTestName: Constant.TESTTYPE.ES_OUT
                                }
                            ];
                        } else {
                            return [{
                                testInspectedBy: oGlobalModel.getProperty("/EmployeeData/empNameEnglish"),
                                testInspectedByCode: oGlobalModel.getProperty("/EmployeeData/empCode"),
                                testInspectionEndDate: null,
                                testInspectionStartDate: null,
                                testStatus: Constant.STATUS.OPEN,
                                applicableTestName: testItem.INTERNALCHARNO,
                                processWorkflowInstanceId: null,
                                currTaskInstanceId: null,
                                pendingWithUser: null
                            }];
                        }
                    });

                    vehOrdInspLines.push({
                        orderLineNo: null,
                        childOrderNo_vehicleOrderInspectionUUID: null,
                        childSeviceRequestNo: null,
                        childMaterialCode: null,
                        childOrderLineNo: null,
                        materialCode: serviceItem.Material || null,
                        materialName: serviceItem.ServiceName || null,
                        materialNameArabic: serviceItem.ServiceArabicName || null,
                        materialType: serviceItem.MaterialType || null,
                        materialGroup: serviceItem.MaterialGroup || null,
                        inspectionType: sInspectionType,
                        quantity: Constant.oneRecordCheck,
                        unitPrice: iUnitPrice.toFixed(2),
                        vat: iVat.toFixed(2),
                        currencyCode: serviceItem.ContCurrency || Constant.CURRENCY.CURRENCYCODE,
                        currencyText: serviceItem.currencyText || "",
                        lineTotal: sTotalAmount.toFixed(2),
                        totalWithVAT: sTotalAmount.toFixed(2),
                        vatPercent: serviceItem.VATPercentage,
                        discountAmount: serviceItem.DiscountAmount,
                        vatCode: serviceItem.VatCode,
                        totalWithOutVAT: iTotalWithOutVAT.toFixed(2),
                        delMark: Constant.ArrayZeroLength,
                        vehOrdInspLinesTestChars: aTestChars,
                        vehicleOrderInspectionPricing: aVehicleOrderPricing,
                        vehicleOrderCoupans: [],
                        plateNumber: sPlateNo,
                        retestCount: sRetestOrFresh === Constant.TESTMODE.FRESHTEST ? Constant.ArrayZeroLength : Constant.oneRecordCheck,
                        LineIndicator: Constant.LineIndicator,
                        plantCode: oGlobalModel.getProperty("/PlantCode"),
                        inspectionByUser: oGlobalModel.getProperty("/EmployeeData/empNameEnglish"),
                        inspectionByCode: oGlobalModel.getProperty("/EmployeeData/empCode"),
                    });

                });

                // If vehicle existed, update its lines; else push new
                if (oExistingVehicle) {
                    oExistingVehicle.vehOrdInspLines = vehOrdInspLines;
                } else {
                    aVehOrdInspDetails.push({
                        vehicleOrderInspectionDetailsUUID: null,
                        VehicleDetails_vehicleMastersUUID: sVehicleUUID,
                        plateNumber: sPlateNo,
                        plateColor: oGlobalModel.getProperty("/PlateColor").toString(),
                        plateSource: oGlobalModel.getProperty("/PlateSource"),
                        plateKind: oGlobalModel.getProperty("/PlateKind").toString(),
                        laneTypeCode: oGlobalModel.getProperty("/laneTypeCode"),
                        plantCode: oGlobalModel.getProperty("/PlantCode"),
                        inspectionByUser: oGlobalModel.getProperty("/EmployeeData/empNameEnglish"),
                        inspectionByCode: oGlobalModel.getProperty("/EmployeeData/empCode"),
                        laneCode: oGlobalModel.getProperty("/LaneCode"),
                        inspectionStartDateTime: null,
                        inspectionCompletedDateTime: null,
                        status: null,
                        lockedBy: null,
                        lockedByDateTime: null,
                        onHoldDateTime: null,
                        VehicleOrderInspectionLaneChangeDetails: [],
                        vehOrdInspLines
                    });
                }
            });

            // Save updated array in persistent model
            oPersistentModel.setProperty("/VehOrdInspDetailsStore", aVehOrdInspDetails);
            let oCurrentDate = new Date();
            let dCurrentDate = Formatter.getDateFromatIn_yyyyMMdd(oCurrentDate);

            const oFinalPayload = {
                vehicleOrderInspectionUUID: null,
                discountValue: parseFloat(oMaterialModel.getData().DiscountAmount).toFixed(2),
                retry: null,
                error: null,
                runningShiftNumber: oEmployeeData.empShift_shiftId,
                runningBusinessDate: oEmployeeData.BusinessDate,
                runningShiftName: oEmployeeData.empShift.description,
                shiftFromTime: oEmployeeData.empShift.startTime,
                shiftToTime: oEmployeeData.empShift.endTime,
                orderDate: dCurrentDate,
                orderType: Constant.OrderZVOS,
                orderCancellationDate: null,
                orderSubTotal: parseFloat(oMaterialModel.getData().SubTotal).toFixed(2),
                orderSubTotalAfterDiscount: parseFloat(oMaterialModel.getData().SubTotalAfterDis).toFixed(2),
                orderTotal: parseFloat(oMaterialModel.getData().OrderTotal).toFixed(2),
                totalVAT: parseFloat(oMaterialModel.getData().TotalVAT).toFixed(2),
                plantCode: oGlobalModel.getProperty("/PlantCode"),
                salesOrganization: oGlobalModel.getProperty("/SalesArea/0/salesOrganization"),
                salesDivChnl: oGlobalModel.getProperty("/SalesArea/0/distributionChannel"),
                division: oGlobalModel.getProperty("/SalesArea/0/division"),
                plantName: oGlobalModel.getProperty("/PlantName"),
                customerCode_customerUUID: oReTestorFreshTestData[0]?.customerInfo?.customerUUID || null,
                customerName: `${oReTestorFreshTestData[0]?.customerInfo?.firstName || ''} ${oReTestorFreshTestData[0]?.customerInfo?.lastName || ''}`.trim(),
                currencyCode: Constant.CURRENCY.CURRENCYCODE,
                currencyText: null,
                plantRegionCode: oGlobalModel.getProperty("/RegionCode"),
                plantRegionName: oGlobalModel.getProperty("/RegionDesc"),
                orderStatus: Constant.Order_PENDING,
                paymentDate: null,
                paymentUTRNo: null,
                orderReferenceNo: null,
                orderSyncDate: null,
                orderSyncedMessage: "",
                orderSyncedS4: Constant.OrderSyncedS4,
                s4Indicator: Constant.S4Indicator,
                orderCreatedByCode: oGlobalModel.getProperty("/EmployeeData/empCode"),
                orderCreatedByUser: oGlobalModel.getProperty("/EmployeeData/empNameEnglish"),
                VehOrdInspDetails: aVehOrdInspDetails,
                vehRepInfo: oMaterialModel.getProperty("/CustomerInfo")
            };
            oSaveModel.setData(oFinalPayload);
        },

        /**
         * Final Funciton Call to Update Payload for Accessories 
         * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
         * @version 1.0.0
         * @since 10.02.2025
         * @fires changeAccessoreisOrderPayload
         * @author MM
       */

        changeAccessoreisOrderPayload: function (oPayload) {
            let hasAccessories = false;
            let hasService = false;

            // Step 1: Check each material type in vehOrdInspLines
            oPayload.VehOrdInspDetails.forEach(vehicle => {
                vehicle.vehOrdInspLines.forEach(line => {
                    if (line.materialType === Constant.MATERIALTYPE.ACCESSORIES) {
                        hasAccessories = true;
                    }
                    if (line.materialType === Constant.MATERIALTYPE.SERVICE) {
                        hasService = true;
                    }
                });
            });

            // Step 2: Apply business logic for order type
            if (hasAccessories && !hasService) {
                // Case 1 & 2: Accessories (alone or mixed with service)
                oPayload.orderType = Constant.OrderZVSO;
                oPayload.s4Indicator = Constant.AsseccS4Indicator;
                oPayload.orderStatus = Constant.Order_COMPLETED;
                this.getView().getModel("oGlobalModel").setProperty("/AcceOrderStatusFlag", true);
                // Optional: Update all line indicators to "C"
                oPayload.VehOrdInspDetails.forEach(vehicle => {
                    vehicle.vehOrdInspLines.forEach(line => {
                        line.LineIndicator = Constant.AsseccLineIndicator;
                    });
                });
            } else if (hasService && !hasAccessories) {
                // Case 3: Only services
                oPayload.orderType = Constant.OrderZVOS;
                oPayload.s4Indicator = Constant.S4Indicator;
                oPayload.orderStatus = Constant.Order_PENDING;
                this.getView().getModel("oGlobalModel").setProperty("/AcceOrderStatusFlag", false);
                // Optional: set service-specific indicator
                oPayload.VehOrdInspDetails.forEach(vehicle => {
                    vehicle.vehOrdInspLines.forEach(line => {
                        line.LineIndicator = Constant.LineIndicator;
                    });
                });
            } else {
                oPayload.orderType = Constant.OrderZVSO;
                oPayload.s4Indicator = Constant.S4Indicator;
                oPayload.orderStatus = Constant.Order_PENDING;
                this.getView().getModel("oGlobalModel").setProperty("/AcceOrderStatusFlag", false);
                oPayload.VehOrdInspDetails.forEach(vehicle => {
                    vehicle.vehOrdInspLines.forEach(line => {
                        line.LineIndicator = Constant.LineIndicator;
                    });
                });

            }

            return oPayload;
        },



        /**
          * Final Funciton Calling for Save Sales Order 
          * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
          * @version 1.0.0
          * @since 10.02.2025
          * @fires onBtnPressSaveSalesOrder
          * @author MM
        */

        onBtnPressSaveSalesOrder: async function () {
            const oSrcModel = this.getView().getModel("SalesOrderEntryRes");
            const oSrcObject = oSrcModel.getData();
            const oMaterialModel = this.getView().getModel("SalesOrderCardDataModel");
            const oPlateMaterials = oMaterialModel.getProperty("/PlateMaterials") || {};

            const bHasEmpty =
                oPlateMaterials.length === 0 || // treat 0 as empty
                Object.values(oPlateMaterials).some(
                    a => Array.isArray(a) && a.length === Constant.ArrayZeroLength
                );

            const oGlobalModel = this.getView().getModel("oGlobalModel");
            const isPayment = oGlobalModel.getProperty("/IsFromPayment");
            const oVehicleModel = this.getOwnerComponent().getModel("plateModel").getData();
            const oEmployeeData = Formatter.onLoadGetDataInSessionStorage('BusinessData');

            if (oVehicleModel.plates.length > Constant.ArrayTenLength) {
                MessageBox.warning(this.oBundle.getText("salesOrder_messageYouCanAddMaximum"));
                return;
            }

            if (bHasEmpty || oSrcObject.plantCode == null) {
                MessageBox.warning(this.oBundle.getText("salesOrder_messageToastPlsSelectatLeastoneMaterial"));
                return
            }

            // Set required data
            oSrcModel.setProperty("/orderDate", oEmployeeData.BusinessDate);
            oGlobalModel.setProperty("/MaterialPayload", oSrcObject);

            let updatedPayload = this.changeAccessoreisOrderPayload(oSrcObject);

            console.log(updatedPayload);
            // Fetch existing order response
            const oSalesOrderRes = oGlobalModel.getProperty("/OrderResponse");
            let sMethod = Constant.POST;
            let sUrl = "/VehicleOrderInspections";

            //  Detect Update Mode: Either from payment screen or valid UUID available
            if (isPayment || oSalesOrderRes?.vehicleOrderInspectionUUID) {
                sMethod = Constant.PATCH;
                sUrl = `/VehicleOrderInspections(guid'${oSalesOrderRes.vehicleOrderInspectionUUID}')?$expand=VehOrdInspDetails($expand=vehOrdInspLines($expand=vehOrdInspLinesTestChars))`;
            }

            // Save the form data
            await this.saveEntryForm(sMethod, sUrl, updatedPayload);

            // Get API response
            const oResponse = this.getApiResponseObject();
            const oResultModel = new JSONModel(oResponse.object.d);
            oGlobalModel.setProperty("/OrderResponse", oResponse.object.d);
            this.getOwnerComponent().setModel(oResultModel, "GetSalesOrderResponse");

            //  Handle response
            if (oResponse?.success) {
                let sMessage = "";

                if (sMethod === Constant.POST) {
                    sMessage = this.oBundle.getText("salesOrder_messageToastServiceCreated", [oResponse.object.serviceRequestNo]);
                } else {
                    sMessage = this.oBundle.getText("salesOrder_messageToastServiceUpdated", [oResponse.object.serviceRequestNo]);
                }

                MessageToast.show(`${sMessage}`, { duration: 5000 });

                await this.delay(500); // allow backend to settle
                await this.onBtnPressToPayment(); // navigate to payment
                oGlobalModel.setProperty("/isBackToOrder", false);
                oGlobalModel.setProperty("/SelectedModifedFlag", "");
                oGlobalModel.setProperty("/IsFromPayment", false);
                this.getView().getModel("BackToSearchVehicleModel").setProperty("/isBackToVehicle", false);

            } else {
                let oRes = JSON.parse(oResponse.object.responseText);
                MessageBox.error(oRes.error?.message?.value);
                return;
            }
        },

        delay: function (ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
      * After Create Sales Order go to Payment Integration Page 
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires onBtnPressToPayment
      * @author MM
      */

        onBtnPressToPayment: async function () {

            let oModel = this.getView().getModel("SalesOrderCardDataModel");
            oModel.setProperty("/Currency", Constant.CURRENCY.CURRENCYCODE);
            //this.getOwnerComponent().setModel(oModel, "SalesOrderCardDataModel");
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo(Constant.PaymentIntegration, {
                source: "services"
            });

        },

        /**
      * Calculate Grand Total 
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires _getCalculatedValue
      * @author MM
      */

        _getCalculatedValue: function () {
            let iGrandTotal = 0;
            let iSubTotal = 0;
            let iGrandVAT = 0;
            let iTotalDiscount = 0;
            let iSubTotalAfterDis = 0;

            let oMaterialModel = this.getView().getModel("SalesOrderCardDataModel");
            const oSrcModel = this.getView().getModel("SalesOrderEntryRes");
            let oMaterialData = oMaterialModel.getData();

            // Create a new model and copy data
            for (let key in oMaterialData.PlateMaterials) {
                oMaterialData.PlateMaterials[key].forEach(item => {
                    iGrandTotal += parseFloat(item.Price);
                    iSubTotal += parseFloat(item.TotalWithOutVAT);
                    iGrandVAT += parseFloat(item.VAT);
                    iTotalDiscount += parseFloat(item.DiscountAmount);
                    iSubTotalAfterDis += parseFloat(item.SubTotalAfterDis);
                });
            }

            oMaterialModel.setProperty("/DiscountAmount", parseFloat(iTotalDiscount).toFixed(2));
            oMaterialModel.setProperty("/SubTotalAfterDis", parseFloat(iSubTotalAfterDis).toFixed(2));
            oMaterialModel.setProperty("/SubTotal", parseFloat(iGrandTotal).toFixed(2));
            oMaterialModel.setProperty("/OrderTotal", parseFloat(iSubTotalAfterDis).toFixed(2));
            oMaterialModel.setProperty("/TotalWithoutVat", parseFloat(iSubTotal).toFixed(2));
            oMaterialModel.setProperty("/TotalWithVat", parseFloat(iGrandTotal).toFixed(2));
            oMaterialModel.setProperty("/TotalVAT", parseFloat(iGrandVAT).toFixed(2));

            oSrcModel.setProperty("/discountValue", parseFloat(iTotalDiscount).toFixed(2));
            oSrcModel.setProperty("/orderSubTotalAfterDiscount", parseFloat(iSubTotalAfterDis).toFixed(2));
            oSrcModel.setProperty("/orderSubTotal", parseFloat(iGrandTotal).toFixed(2));
            oSrcModel.setProperty("/orderTotal", parseFloat(iSubTotalAfterDis).toFixed(2));
            oSrcModel.setProperty("/totalVAT", parseFloat(iGrandVAT).toFixed(2));
        },

        /**
      * Used for Search Material based on Matrial Code or Name
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires _getSearchData
      * @author MM
      */

        _getSearchData: async function (oEvent) {
            let oMaterialModel = this.getView().getModel("MaterialMasterModel");
            let oSalesOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
            let oMatDataResFull = this._aOriginalMaterialData || oMaterialModel.getData().results;
            let sQuery = oEvent.getParameter("newValue");
            let aFilteredResults = [];

            // Keep backup of full material data once
            if (!this._aOriginalMaterialData) {
                this._aOriginalMaterialData = JSON.parse(JSON.stringify(oMatDataResFull));
            }

            // Get current plate and selected materials
            let sPlateNo = oSalesOrderCardModel.getProperty("/PlateNo");
            let oPlateMaterials = oSalesOrderCardModel.getProperty("/PlateMaterials") || [];
            let aSelectedMaterials = oPlateMaterials[sPlateNo] || [];

            if (sQuery && sQuery.trim() !== "" && sQuery.length > Constant.ArrayZeroLength) {
                let sQueryAsNumber = parseInt(sQuery, 10);

                // Filter items
                aFilteredResults = oMatDataResFull.filter(item =>
                    (item.MATERIALENGLISHDESCRIPTION && item.MATERIALENGLISHDESCRIPTION.toLowerCase().includes(sQuery.toLowerCase())) ||
                    (item.MATERIALCODE && item.MATERIALCODE.toString().includes(sQueryAsNumber))
                );
            } else {
                aFilteredResults = oMatDataResFull;
            }

            // Re-apply highlight if selected
            aFilteredResults.forEach(item => {
                item.Highlight = aSelectedMaterials.some(mat => mat.Material === item.MATERIALCODE)
                    ? Constant.INFORMATION
                    : Constant.NONE;
            });

            // Update model

            oMaterialModel.setProperty("/d/results", aFilteredResults);
            await this._restoreSelectedMaterials();
        },

        /**
      * Delete Vehcile Functionality
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires onBtnPressDeleteVehicle
      * @author MM
      */

        onBtnPressDeleteVehicle: async function () {

            const oPlateDataModel = this.getView().getModel("PlateDataModel");
            const aPlateNumbers = this.byId(ControlIds.Order.TAB_BAR).getItems().map(tab => tab.getKey()); // or use tab.getText()
            oPlateDataModel.setData({ plateNumbers: aPlateNumbers });

            if (!this.delVehFlag) {
                this.delVehFlag = sap.ui.xmlfragment(ControlIds.Order.DELETEVEH, "adnoc.vi.vehicleinspection.modone.fragment.view.DeleteVehicleList", this);
                this.getView().addDependent(this.delVehFlag);
            }
            this.delVehFlag.open();

        },

        /**
      * Close Delete Vehcile Fragment
      * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
      * @version 1.0.0
      * @since 10.02.2025
      * @fires onBtnPressCloseDelVeh
      * @author MM
      */

        onBtnPressCloseDelVeh: async function () {
            if (this.delVehFlag) {
                this.delVehFlag.close();
            }
        },

        /**
     * Select which Vehicle need to delete from fragment 
     * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
     * @version 1.0.0
     * @since 10.02.2025
     * @fires onBtnPressDeleteVeh,onBtnPressDelete
     * @author MM
     */

        onBtnPressDeleteVeh: async function () {
            const oList = Fragment.byId(ControlIds.Order.DELETEVEH, "VehcileList");
            const oSelectedItem = oList.getSelectedItem();
            if (!oSelectedItem) {
                MessageToast.show(this.oBundle.getText("salesOrder_messageToastPleaseselectplatetodelete"));
                return;
            }

            const sPlateToDelete = oSelectedItem.getTitle(); // Get selected plate number
            this.onBtnPressDelete(sPlateToDelete);

        },

        /**
     * delete Vehcile from fragment 
     * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
     * @version 1.0.0
     * @since 10.02.2025
     * @fires onBtnPressDelete
     * @author MM
     */

        onBtnPressDelete: function (sPlateToDelete) {

            MessageBox.confirm(
                this.oBundle.getText("salesOrder_messageToastAreyousureyouwanttoConfirm"), {
                icon: MessageBox.Icon.INFORMATION,
                title: this.oBundle.getText("commonmsgConfirmation"),
                class: "sapUiSizeCompact",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        const oIconTabBar = this.byId(ControlIds.Order.TAB_BAR);
                        const oPlateModel = this.getOwnerComponent().getModel("plateModel");
                        const oMaterialModel = this.getView().getModel("SalesOrderCardDataModel");

                        // Remove tab from IconTabBar
                        const aTabs = oIconTabBar.getItems();

                        const sPlateNoToDelete = sPlateToDelete.split("Plate No. ")[1];
                        const oTabToRemove = aTabs.find(tab => tab.getKey() === sPlateToDelete.split("Plate No. ")[1] || tab.getText() === sPlateToDelete.split("Plate No. ")[1]);
                        if (oTabToRemove) {
                            oIconTabBar.removeItem(oTabToRemove);
                        }

                        // Remove from plateModel
                        const aPlates = oPlateModel.getProperty("/plates") || [];
                        const aUpdatedPlates = aPlates.filter(p => p !== sPlateToDelete.split("Plate No. ")[1]);
                        oPlateModel.setProperty("/plates", aUpdatedPlates);

                        // Remove from PlateMaterials (material list)
                        const oPlateMaterials = oMaterialModel.getProperty("/PlateMaterials") || [];
                        delete oPlateMaterials[sPlateToDelete.split("Plate No. ")[1]];
                        oMaterialModel.setProperty("/PlateMaterials", oPlateMaterials);
                        let sRemoveText = this.oBundle.getText("salesOrder_messageToastRemoved");

                        //  Remove from VehOrdInspDetails
                        const oSalesOrderModel = this.getView().getModel("SalesOrderEntryRes"); // adjust if different
                        const aVehOrdInspDetails = oSalesOrderModel.getProperty("/VehOrdInspDetails") || [];
                        oSalesOrderModel.setProperty(
                            "/VehOrdInspDetails",
                            aVehOrdInspDetails.filter(oDetail => oDetail.plateNumber !== sPlateNoToDelete)
                        );

                        // Optional: Refresh UI elements or clear selection
                        MessageToast.show(`${sPlateToDelete} ${sRemoveText}`);
                        const aRemainingTabs = oIconTabBar.getItems();

                        // Loop through all remaining plates and their materials
                        Object.keys(oPlateMaterials).forEach(sPlate => {
                            let aMaterials = oPlateMaterials[sPlate] || [];
                            aMaterials.forEach(oMat => {
                                oMat.Highlight = Constant.INFORMATION
                            });

                            // Update back to the model
                            oMaterialModel.setProperty(`/PlateMaterials/${sPlate}`, aMaterials);
                            oMaterialModel.setProperty(`/PlateNo`, sPlate);
                        });

                        if (aRemainingTabs.length > 0) {
                            let sNextKey = aRemainingTabs[0].getKey(); // fallback: first tab
                            oIconTabBar.setSelectedKey(sNextKey);
                            this.onIconTabSelect();

                        } else {
                            // No tabs left → navigate back
                            this.getView().getModel("oGlobalModel").setProperty("/isBackToOrder", false);
                            this.getView().getModel("BackToSearchVehicleModel").setProperty("/isBackToVehicle", false);
                            let oRouter = UIComponent.getRouterFor(this);
                            oRouter.navTo(Constant.SearchVehicle, true);
                        }
                        this._getCalculatedValue();

                        this.delVehFlag.close(); // Close dialog
                    }
                }.bind(this)
            });

        },

        /**
    * Function Triggered for Auto Selected Materials Card based on Plate Number
    * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
    * @version 1.0.0
    * @since 10.02.2025
    * @fires autoSelectReTestMaterials
    * @author MM
    */

        autoSelectReTestMaterials: function () {
            const oPlateModel = this.getOwnerComponent().getModel("plateModel").getData();
            const aSelectedPlates = oPlateModel.plates || [];

            const oMaterialModel = this.getView().getModel("MaterialMasterModel");
            let oSalesOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
            const aAllMaterials = oMaterialModel.getData().d.results || [];

            //  Filter only materials with valid plate and RE-TEST
            const aFilteredMaterials = aAllMaterials.filter(material =>
                aSelectedPlates.includes(material.PLATENUMBER) &&
                material.TESTTYPE === Constant.TESTMODELPAYLOAD.RETEST &&
                material.PLATENUMBER && material.MATERIALCODE // Ensure both are present
            );

            MessageToast.show(this.oBundle.getText("salesOrder_messageToastRetestAutoSelect"), {
                duration: 5000
            });

            //  Track unique MATERIALCODE + PLATENUMBER pairs
            const oUniqueMap = new Map(); // key: plateNumber+materialCode
            const aUniqueMaterials = aFilteredMaterials.filter(mat => {
                const key = `${mat.PLATENUMBER}___${mat.MATERIALCODE}`;
                if (!oUniqueMap.has(key)) {
                    oUniqueMap.set(key, true);
                    return true;
                }
                return false; // duplicate
            });

            // 🔄 Group by plate number
            const materialsByPlate = aUniqueMaterials.reduce((acc, material) => {
                const plate = material.PLATENUMBER;
                if (!acc[plate]) {
                    acc[plate] = [];
                }
                acc[plate].push(material);
                return acc;
            }, {});

            // Iterate each plate group
            Object.keys(materialsByPlate).forEach(plateNo => {
                const materials = materialsByPlate[plateNo];

                // Set current vehicle/tab context
                oSalesOrderCardModel.setProperty("/PlateNo", plateNo);
                //oSalesOrderCardModel.setProperty("/PlateCodeName", materials[0].PLATECODENAME || "");

                // Auto-select for this plate
                materials.forEach(material => {
                    this.onBtnPressSelectMaterial(material);
                });
            });

            // Optional: Refresh view/model
            oMaterialModel.refresh(true);
        },

        /**
          * Function Triggered for Change Lane and get Lane Based Materials
          * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
          * @version 1.0.0
          * @since 10.02.2025
          * @fires _onRowSelectFromMaster
          * @author MM
        */

        _onRowSelectFromMaster: function () {
            MessageBox.confirm(
                this.oBundle.getText("salesOrder_messageBoxLaneChangeConfirm"), {
                icon: MessageBox.Icon.CONFIRM,
                title: this.oBundle.getText("commonmsgConfirmation"),
                class: "cl_Emphasizebtn",
                type: "Emphasized",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        let oSalesOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
                        // Delay execution so MessageBox closes first
                        setTimeout(function () {
                            let oMaterialModel = this.getView().getModel("MaterialMasterModel");
                            let aAllMaterials = oMaterialModel.getProperty("/d/results") || [];
                            let oGridList = this.byId(ControlIds.Order.GRID_LIST);

                            // Add fade-out animation class to each item
                            aAllMaterials.forEach((index) => {
                                const oItem = oGridList.getItems()[index];
                                if (oItem) {
                                    oItem.addStyleClass("fadeOutItem");
                                }
                            });

                            // Wait for animation to complete before clearing data
                            setTimeout(function () {
                                aAllMaterials.forEach((index) => {
                                    const oItem = oGridList.getItems()[index];
                                    if (oItem) {
                                        oItem.removeStyleClass("fadeOutItem");
                                        oItem.removeStyleClass("material_selection");
                                        oItem.addStyleClass("serviceCard");
                                    }
                                });

                                oSalesOrderCardModel.setProperty("/MyCartCount", 0);
                                oSalesOrderCardModel.setProperty("/MyCartItems", []);
                                oSalesOrderCardModel.setProperty("/PlateMaterials", []);

                                // Now fetch new material list
                                this._getMaterialMaster();

                            }.bind(this), 500);
                        }.bind(this), 0); // let MessageBox close first
                    }
                }.bind(this)
            });
        },

        /**
          * Function Triggered for Create Accessories Common Payload
          * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
          * @version 1.0.0
          * @since 10.02.2025
          * @fires _buildCommonPayload
          * @author MM
        */
        _buildCommonPayload: function (sTestType = Constant.TESTMODE.ACCESSORIES) {
            const oGlobal = this.getView().getModel("oGlobalModel");
            let dCurrentDate = new Date();

            const dFormattedDate = Formatter.getDateFromatIn_yyyyMMdd(dCurrentDate);
            const sTime = Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(dCurrentDate).split(" ")[1];

            return {
                sCurDate: dFormattedDate,
                sPlateSource: oGlobal.getProperty("/PlateSource"),
                sVehicleType: oGlobal.getProperty("/VehicleType"),
                sVehicleYear: oGlobal.getProperty("/VehicleYear"),
                sPlateNumber: oGlobal.getProperty("/PlateNo"),
                sPlantCode: oGlobal.getProperty("/PlantCode"),
                sDstributionChannel: oGlobal.getProperty("/SalesArea/0/distributionChannel"),
                sSalesOrganization: oGlobal.getProperty("/SalesOrganization"),
                sRegion: oGlobal.getProperty("/RegionCode"),
                sListType: oGlobal.getProperty("/laneTypeCode"),
                sFromTime: sTime,
                sToTime: sTime,
                sTestType: sTestType,
                oFilter: []   // keep it empty for now, can be extended
            };
        },


        /**
          * Function Triggered for Auto Complete Accessories
          * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
          * @version 1.0.0
          * @since 10.02.2025
          * @fires _onRowSelectFromMaster
          * @author MM
        */

        _getAutoCompleteAccessories: async function () {
            const sDynamicInspType = this.getView().getModel("oGlobalModel").getProperty("/DynamicInspectionType");
            this.getFormattedTitle(sDynamicInspType);
            let oPayload = this._buildCommonPayload(Constant.TESTMODE.ACCESSORIES);

            // Call API
            await this.createNewModelUsingAPI(
                Constant.POST,
                `/getMaterialDetails`,
                oPayload,
                'AutoAccessoriesModel'
            );

            const oAsseccMaterial = this.getApiResponseObject();
            if (oAsseccMaterial.success) {

                let oModel = this.getView().getModel('AutoAccessoriesModel');
                let oData = oModel.getData();
            } else {
                let oResponse = JSON.parse(oAsseccMaterial.object.responseText);
                MessageBox.error(oResponse.error?.message?.value);
                return;
            }
        },

        /**
          * Function Triggered for Open Accessories CFL
          * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
          * @version 1.0.0
          * @since 10.02.2025
          * @fires openCflForAccessories
          * @author MM
        */

        openCflForAccessories: async function () {

            const sDynamicInspType = this.getView().getModel("oGlobalModel").getProperty("/DynamicInspectionType");
            this.getFormattedTitle(sDynamicInspType);
            let oPayload = this._buildCommonPayload(Constant.TESTMODE.ACCESSORIES);

            await this.createNewModelUsingAPI(
                Constant.POST,
                '/getMaterialDetails',
                oPayload,
                'AutoAccessoriesModel'
            );
            this.setCflTitle(this.oBundle.getText("salesOrder_AccessCFL"))
            this.setCflDisplayColumns(['EAN Number', 'Material Code']);
            this.setCflDataColumns(['EANNO', 'MATERIALCODE']);
            this.setCflValueAndDisplay('/EANNO', 'MATERIALCODE');
            this.setCflSearchProperty('EANNO', 'MATERIALCODE');
            this.showCfl('EANNO', 'AutoAccessoriesModel', 'results/0/aFilteredMaterials', this.onClosecflAccessories.bind(this));

        },

        /**
           * Function for Close CFL for Source Master
           * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
           * @version 1.0.0
           * @since 10.02.2025
           * @fires onClosecflSourceReTest
           * @author MM
        */
        onClosecflAccessories: function () {
            let oCFLRes = this.getCflObject();
            let oResModel = this.getView().getModel("SalesOrderCardDataModel");
            oResModel.setProperty('/MaterialNum', oCFLRes.EANNO);
        },

        /**
           * Function for Selected filtred Accessories
           * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
           * @version 1.0.0
           * @since 10.02.2025
           * @fires onSelectedAccessoreis
           * @author MM
       */

        onSelectedAccessoreis: function () {
            if (Fragment.byId("MaterialScan", "MaterialEANId").getValue() !== "") {
                let oPlateAutoRes = this.getView().getModel('AutoAccessoriesModel').oData.results[0].aFilteredMaterials.filter(E => E.EANNO == Fragment.byId("MaterialScan", "MaterialEANId").getValue());
                this.getView().getModel("SalesOrderCardDataModel").setProperty("/MaterialNum", oPlateAutoRes[0].EANNO);
            }
        },

        /**
            * Function for Filter Accessories
            * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
            * @version 1.0.0
            * @since 10.02.2025
            * @fires filterAccessories
            * @author MM
        */
        filterAccessories: function (oEvent) {
            let sValue = oEvent.getParameter("value").toLowerCase() + "";
            let oModel = this.getView().getModel('AutoAccessoriesModel').getData().results[0].aFilteredMaterials.filter(x => x.EANNO.includes(sValue));
            this.getView().getModel("AutoAccessoriesModel").setProperty("/results/0/aFilteredMaterials", oModel);
        },

        /**
       * Back to search vehicle 
       * @memberof adnoc.vi.vehicleinspection.modone.controller.Services
       * @version 1.0.0
       * @since 10.02.2025
       * @fires onBtnPressBackToSearchVeh
       * @author MM
       */

        onBtnPressBackToSearchVeh: function () {
            let oVehicleData = this.getView().getModel("SalesOrderCardDataModel").getData();
            let oVehicleCurrentTabData = aPreviousData.find(item => { return item.plateNumber === oVehicleData.PlateNo });
            oVehicleCurrentTabData.BackToSearchVehicle = true;

            oVehicleCurrentTabData.customerInfo.firstName = oVehicleData.CustomerInfo.firstName;
            oVehicleCurrentTabData.customerInfo.lastName = oVehicleData.CustomerInfo.lastName;
            oVehicleCurrentTabData.customerInfo.mobileNo = oVehicleData.CustomerInfo.mobileNo;
            oVehicleCurrentTabData.customerInfo.emailAddress = oVehicleData.CustomerInfo.emailAddress;
            oVehicleCurrentTabData.customerInfo.customertype = oVehicleData.CustomerInfo.customertype;

            let oSetVehicleModel = new JSONModel(oVehicleCurrentTabData);
            this.getOwnerComponent().setModel(oSetVehicleModel, 'BackToVehicleDataModel');
            let oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo(Constant.SearchVehicle, false);
            this.getView().getModel('oGlobalModel').setProperty('/isExistFlag', false);
            this.getView().getModel('oGlobalModel').setProperty('/isAddMoreVehicle', true);
            this.getView().getModel('BackToSearchVehicleModel').setProperty("/isBackToVehicle", true);
        },

    });


});