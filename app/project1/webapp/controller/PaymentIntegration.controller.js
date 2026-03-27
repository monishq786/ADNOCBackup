/**
* Services Controller (V1.0).
* This Controller used to Add Items into cart & do payment with Multiple MOP's
* @author MM
* @date 10.05.2025
*/

sap.ui.define([
	'adnoc/vi/vehicleinspection/core/generic/genericentryform',
	"sap/m/MessageToast",
	'adnoc/vi/vehicleinspection/modone/constants/Constant',
	'adnoc/vi/vehicleinspection/modone/constants/ControlIds',
	'adnoc/vi/vehicleinspection/modone/constants/PaymentConstant',
	"sap/m/MessageBox",
	'adnoc/vi/vehicleinspection/modone/formatter/Formatter',
	'sap/ui/model/json/JSONModel',
	'sap/m/Dialog',
	'sap/m/Image',
	'sap/m/Button',
	'sap/m/PDFViewer',
], function (genericentryform, MessageToast, Constant, ControlIds, PaymentConstant, MessageBox, Formatter, JSONModel, Dialog, Image, Button, PDFViewer) {
	"use strict";
	let sFacingMode = "environment"
	return genericentryform.extend("adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration", {

		/**
		 * Function using for to Load Page
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 10.02.2025
		 * @fires onInit
		 * @author MM
		 */

		onInit: function () {
			genericentryform.prototype.onInit.apply(this, arguments);
			this.getOwnerComponent().getRouter()
				.getRoute(Constant.PaymentIntegration)
				.attachPatternMatched(this._onRouteMatched, this);
		},

		/**
		 * Function using for route match based on conditions
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 10.02.2025
		 * @fires _onRouteMatched,_handleRouteMatched
		 * @author MM
		 */


		_onRouteMatched: function (oEvent) {
			const sSource = oEvent.getParameter("arguments").source;
			let oGlobalModelRes = this.getView().getModel("oGlobalModel");

			if (sSource === "services") {
				oGlobalModelRes.setProperty("/isServicePage", true);
				oGlobalModelRes.setProperty("/isAccessoriesPage", false);
			} else {
				oGlobalModelRes.setProperty("/isAccessoriesPage", true);
				oGlobalModelRes.setProperty("/isServicePage", false);
			}

			let oMaterialModel = this.getView().getModel("SalesOrderCardDataModel");
			let oServiceViewModel = this.getView().getModel("ServicesViewModel");
			let oMaterialData = oMaterialModel.getData();
			let aAllMaterials;

			if (oGlobalModelRes.getProperty("/isServicePage")) {
				aAllMaterials = Object.values(oMaterialData.PlateMaterials).flat();
				oMaterialModel.setProperty("/MyCartItems", aAllMaterials);
			} else {
				aAllMaterials = oMaterialData.MyCartItems;
				oMaterialModel.setProperty("/MyCartItems", aAllMaterials);
			}

			oGlobalModelRes.setProperty("/MyPrevCartItems", aAllMaterials);
			oServiceViewModel.setProperty("/MyCartItems", aAllMaterials);
			oMaterialModel.setProperty("/CartTotalItem", aAllMaterials.length);
			this._getCalculatedTotal();
		},

		/**
		 * Function using for show initilization calling process
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 10.02.2025
		 * @fires initialize,showEntryForm
		 * @author MM
		 */

		onBeforeShow: async function () {
			this.initialize();
			await this.showEntryForm();
		},

		/**
		* Function for Initilization for Generic Required Function
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 10.02.2025
		* @fires initialize,_getCalculatedTotal,onReadKey
		* @author MM
		*/

		initialize: async function () {
			let oPlantSession = Formatter.onLoadGetDataInSessionStorage("PlantDetails");
			let oGlobal = this.getView().getModel("oGlobalModel");
			oGlobal.setProperty("/MainPlantSiteNo", oPlantSession.legacySiteNo);

			let oModel = new JSONModel({
				UpdatebtnVisible: false
			});

			const oIdTypesModel = new JSONModel(Constant.oIdTypes);
			this.getView().setModel(oIdTypesModel, "IdTypesModel");

			this.getView().setModel(oModel, "ButtonVisibleModel");
			this.byId(ControlIds.PaymentIntegration.PAYMENT_CART).setSelectedKey("Cart");

		},

		onAfterRendering: function () {
			this.oBundle = this.getView().getModel("i18n").getResourceBundle();
		},

		/**
	  * Function for go next screen after payment
	  * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	  * @version 1.0.0
	  * @since 10.02.2025
	  * @fires onBtnPressCancel,_clearTabsData
	  * @author MM
	  */

		onBtnPressCancel: async function () {
			MessageBox.confirm(
				this.oBundle.getText("mainMenu_messageBoxWantToExit"), {
				icon: MessageBox.Icon.CONFIRM,
				title: this.oBundle.getText("mainMenu_messageBoxWantToExit"),
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {
						this._updateOrderStatusForCancel()
						this._clearTabsData();
						this._clearMOP();
						const oRouter = this.getOwnerComponent().getRouter();
						oRouter.navTo(Constant.SearchVehicle, {}, true);
					}
				}.bind(this)
			});
		},

		/**
		 * Function for Clear Tab Data from  payment
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 10.02.2025
		 * @fires _clearTabsData
		 * @author MM
		*/

		_clearTabsData: function () {
			const oPlateModel = this.getOwnerComponent().getModel("plateModel");
			const soCardModel = this.getView().getModel("SalesOrderCardDataModel");
			const soGlobalModel = this.getView().getModel("oGlobalModel");

			if (soGlobalModel.getProperty("/isServicePage")) {
				soCardModel.setProperty("/PlateNo", null);
				soCardModel.setProperty("/PlateMaterials", []);
				oPlateModel.setProperty("/plates", []);
			}
			soCardModel.setProperty("/MyCartCount", 0);
			soCardModel.setProperty("/MyCartItems", []);
			this.getOwnerComponent().getEventBus().publish("tabs", "clear");
		},

		/**
	   * Function for Delete Materials which selected rom order
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	   * @version 1.0.0
	   * @since 10.02.2025
	   * @fires onBtnPressDeleteForService,_getCalculatedTotal,_getUpdateSalesOrderStatus
	   * @author MM
	   */

		onBtnPressDeleteForService: function (oEvent) {
			let oSalesOrderModel = this.getView().getModel("SalesOrderCardDataModel");
			let oGlobalModel = this.getView().getModel("oGlobalModel");
			let oClickedMaterial = oEvent.getSource().getBindingContext("SalesOrderCardDataModel").getObject();

			let sMaterialId = oClickedMaterial.Material;
			let sPlateNumber = oClickedMaterial.PlateNo; // Required for matching vehicle

			MessageBox.confirm(
				this.oBundle.getText("payment_messageBoxAreyousurewanttoDelete"), {
				icon: MessageBox.Icon.CONFIRM,
				title: this.oBundle.getText("commonmsgConfirmation"),
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {
						// Get actual PlateMaterials model (default unnamed model)
						let oPlateModel = this.getView().getModel("SalesOrderCardDataModel");
						let aPlateMaterials = oPlateModel.getProperty("/PlateMaterials");
						let aAllMaterials = Object.values(aPlateMaterials).flat();
						let sVehicleKey = sPlateNumber; // This is the key itself
						let aVehicleMaterials = aPlateMaterials[sVehicleKey];

						if (aVehicleMaterials.length > Constant.ArrayZeroLength) {
							let iMaterialIndex = aVehicleMaterials.findIndex(mat => mat.Material === sMaterialId && mat.PlateNo === sPlateNumber);
							if (iMaterialIndex !== -1) {
								aVehicleMaterials.splice(iMaterialIndex, 1);
								oPlateModel.setProperty(`/PlateMaterials/${sVehicleKey}`, aVehicleMaterials);
							}
						}

						// Recalculate total for that vehicle
						if (aVehicleMaterials.length !== Constant.ArrayZeroLength) {
							let iSum = aVehicleMaterials.map(o => parseFloat(o.TotalAmount || 0)).reduce((a, c) => a + c, 0);
							let iVat = aVehicleMaterials.map(o => parseFloat(o.VAT || 0)).reduce((a, c) => a + c, 0);
							let iTotalDiscount = aVehicleMaterials.map(o => parseFloat(o.DiscountAmount || 0)).reduce((a, c) => a + c, 0);
							let iSubTotalAfterDis = aVehicleMaterials.map(o => parseFloat(o.SubTotalAfterDis || 0)).reduce((a, c) => a + c, 0);

							oSalesOrderModel.setProperty("/SubTotal", iSum.toFixed(2));
							oGlobalModel.setProperty("/Coupon_SavedAmt", iTotalDiscount);
							oSalesOrderModel.setProperty("/DiscountAmount", iTotalDiscount.toFixed(2));

							oSalesOrderModel.setProperty("/VatAmount", iVat.toFixed(2));
							oSalesOrderModel.setProperty("/TotalAmount", iSum.toFixed(2));

							if (!oGlobalModel.getProperty("/isCouponApplied")) {
								oSalesOrderModel.setProperty("/OrderTotal", iSubTotalAfterDis.toFixed(2));
								oSalesOrderModel.setProperty("/SubTotalAfterDis", iSubTotalAfterDis.toFixed(2));

								//  Optional: Rebuild the flat MyCartItems list if needed
								let aFlattened = [];
								aPlateMaterials.forEach(vehicle => {
									aFlattened.push(...vehicle);
								});
								oSalesOrderModel.setProperty("/MyCartItems", aFlattened);

								//  Refresh and utility calls
								oPlateModel.refresh(true);
								this._getCalculatedTotal();
								this._getUpdateSalesOrderStatus();
							} else {
								oSalesOrderModel.setProperty("/SubTotalAfterDis", parseFloat(iSum).toFixed(2) - parseFloat(iTotalDiscount).toFixed(2));
								oSalesOrderModel.setProperty("/OrderTotal", parseFloat(iSum).toFixed(2) - parseFloat(iTotalDiscount).toFixed(2));
							}
							oSalesOrderModel.setProperty("/CartTotalItem", aAllMaterials.length - 1);
						} else {

							this.getView().getModel("ButtonVisibleModel").setProperty("/UpdatebtnVisible", false);
							oSalesOrderModel.setProperty("/MyCartItems", []);
							oSalesOrderModel.setProperty("/OrderTotal", "0.00");
							oSalesOrderModel.setProperty("/SubTotal", "0.00");
							oSalesOrderModel.setProperty("/SubTotalAfterDis", "0.00");
							oSalesOrderModel.setProperty("/DiscountAmount", "0.00");
							oSalesOrderModel.setProperty("/TotalAmount", "0.00");
							oSalesOrderModel.setProperty("/VatAmount", "0.00");
							oSalesOrderModel.setProperty("/CartTotalItem", 0);
						}
					}
				}.bind(this)
			});
		},

		/**
	   * Function for Delete Materials which selected rom order
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	   * @version 1.0.0
	   * @since 10.02.2025
	   * @fires onBtnPressDeleteForAccessories,_getCalculatedTotal,_getUpdateSalesOrderStatus
	   * @author MM
	   */

		onBtnPressDeleteForAccessories: function (oEvent) {
			let oSalesOrderModel = this.getView().getModel("SalesOrderCardDataModel");
			let oGlobalModel = this.getView().getModel("oGlobalModel");
			let oClickedMaterial = oEvent.getSource().getBindingContext("SalesOrderCardDataModel").getObject();
			let sMaterialId = oClickedMaterial.Material;

			MessageBox.confirm(
				this.oBundle.getText("payment_messageBoxAreyousurewanttoDelete"), {
				icon: MessageBox.Icon.CONFIRM,
				title: this.oBundle.getText("commonmsgConfirmation"),
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {
						//  Get actual PlateMaterials model (default unnamed model)
						let oSalesOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
						let aAllMaterials = oSalesOrderCardModel.getProperty("/MyCartItems");

						if (aAllMaterials.length > Constant.ArrayZeroLength) {
							let iMaterialIndex = aAllMaterials.findIndex(mat => mat.Material === sMaterialId);
							if (iMaterialIndex !== -1) {
								aAllMaterials.splice(iMaterialIndex, 1);
								oSalesOrderCardModel.setProperty(`/MyCartItems`, aAllMaterials);
							}
						}

						//  Recalculate total for that vehicle
						if (aAllMaterials.length !== Constant.ArrayZeroLength) {
							let iSum = aAllMaterials.map(o => parseFloat(o.TotalAmount || 0)).reduce((a, c) => a + c, 0);
							let iVat = aAllMaterials.map(o => parseFloat(o.VAT || 0)).reduce((a, c) => a + c, 0);
							let iTotalDiscount = aAllMaterials.map(o => parseFloat(o.DiscountAmount || 0)).reduce((a, c) => a + c, 0);
							let iSubTotalAfterDis = aAllMaterials.map(o => parseFloat(o.SubTotalAfterDis || 0)).reduce((a, c) => a + c, 0);

							oSalesOrderModel.setProperty("/SubTotal", iSum.toFixed(2));
							oGlobalModel.setProperty("/Coupon_SavedAmt", iTotalDiscount);
							oSalesOrderModel.setProperty("/DiscountAmount", iTotalDiscount.toFixed(2));

							oSalesOrderModel.setProperty("/VatAmount", iVat.toFixed(2));
							oSalesOrderModel.setProperty("/TotalAmount", iSum.toFixed(2));

							if (!oGlobalModel.getProperty("/isCouponApplied")) {
								oSalesOrderModel.setProperty("/OrderTotal", iSubTotalAfterDis.toFixed(2));
								oSalesOrderModel.setProperty("/SubTotalAfterDis", iSubTotalAfterDis.toFixed(2));

								oSalesOrderModel.setProperty("/MyCartItems", aAllMaterials);
								//  Refresh and utility calls
								oSalesOrderCardModel.refresh(true);
								this._getCalculatedTotal();
								this._getUpdateSalesOrderStatus();
							} else {
								oSalesOrderModel.setProperty("/SubTotalAfterDis", parseFloat(iSum).toFixed(2) - parseFloat(iTotalDiscount).toFixed(2));
								oSalesOrderModel.setProperty("/OrderTotal", parseFloat(iSum).toFixed(2) - parseFloat(iTotalDiscount).toFixed(2));
							}
							oSalesOrderModel.setProperty("/CartTotalItem", aAllMaterials.length);
						} else {

							this.getView().getModel("ButtonVisibleModel").setProperty("/UpdatebtnVisible", false);
							oSalesOrderModel.setProperty("/MyCartItems", []);
							oSalesOrderModel.setProperty("/OrderTotal", "0.00");
							oSalesOrderModel.setProperty("/SubTotal", "0.00");
							oSalesOrderModel.setProperty("/SubTotalAfterDis", "0.00");
							oSalesOrderModel.setProperty("/DiscountAmount", "0.00");
							oSalesOrderModel.setProperty("/TotalAmount", "0.00");
							oSalesOrderModel.setProperty("/VatAmount", "0.00");
							oSalesOrderModel.setProperty("/CartTotalItem", 0);
						}
					}
				}.bind(this)
			});
		},

		/**
	   * Function for Change Quantity 
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	   * @version 1.0.0
	   * @since 10.02.2025
	   * @fires onBtnPressChangeQty,_validateQty,_getCalculatedTotal,_getUpdateSalesOrderStatus
	   * @author MM
	   */

		onBtnPressChangeQty: function (oEvent) {
			const soCardModel = this.getView().getModel("SalesOrderCardDataModel");

			// Get new quantity entered by user
			let iChangeQty = parseFloat(oEvent.getParameter("value")) || 0;

			// Validate zero or negative qty
			if (iChangeQty <= Constant.ArrayZeroLength) {
				this._validateQty(iChangeQty);
				return;
			}

			// Get item context
			const oBindingContext = oEvent.getSource().getBindingContext("SalesOrderCardDataModel");
			const sChangedItemPath = oBindingContext?.getPath();
			if (!sChangedItemPath) return;

			// Get item data
			let oItem = soCardModel.getProperty(sChangedItemPath);
			if (!oItem) return;

			//  Define base per-unit values (store once if not already stored)
			if (!oItem._baseValuesStored) {
				oItem._baseValuesStored = true;
				oItem.BasePrice = parseFloat(oItem.Price) || 0;
				oItem.BaseSubTotalAfterDis = parseFloat(oItem.SubTotalAfterDis) || 0;
				oItem.BaseTotalWithOutVAT = parseFloat(oItem.TotalWithOutVAT) || 0;
				oItem.BaseTotalVAT = parseFloat(oItem.VAT) || 0;
				oItem.BaseDiscount = parseFloat(oItem.DiscountAmount) || 0;
				oItem.BaseTotalAmount = parseFloat(oItem.TotalAmount) || 0;
			}

			//  Multiply each property with new quantity
			oItem.TotalAmount = (oItem.BaseTotalAmount * iChangeQty).toFixed(2);
			oItem.TotalWithOutVAT = (oItem.BaseTotalWithOutVAT * iChangeQty).toFixed(2);
			oItem.VAT = (oItem.BaseTotalVAT * iChangeQty).toFixed(2);
			oItem.DiscountAmount = (oItem.BaseDiscount * iChangeQty).toFixed(2);
			oItem.Price = (oItem.BasePrice * iChangeQty).toFixed(2);
			oItem.SubTotalAfterDis = (oItem.BaseSubTotalAfterDis * iChangeQty).toFixed(2);

			//  Update quantity
			oItem.Qty = iChangeQty.toString();

			//  Push updates back to model
			soCardModel.setProperty(sChangedItemPath, oItem);
			// Optionally recalculate header totals
			this._getCalculatedTotal();
			this._getUpdateSalesOrderStatus();
		},



		/**
	   * Function for Create Payload for Update Sales Order
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	   * @version 1.0.0
	   * @since 10.02.2025
	   * @fires createOrderPayload
	   * @author MM
	   */

		createOrderPayload: function (oInputData) {
			let oCustomerInfoModel = this.getView().getModel("SalesOrderCardDataModel");
			const oPayload = {
				vehicleOrderInspectionUUID: oInputData.vehicleOrderInspectionUUID,
				discountValue: parseFloat(oInputData.discountValue).toFixed(2),
				orderSubTotal: parseFloat(oInputData.orderSubTotal).toFixed(2),
				orderSubTotalAfterDiscount: parseFloat(oInputData.orderSubTotalAfterDiscount).toFixed(2),
				retry: null,
				error: null,
				runningShiftNumber: oInputData.runningShiftNumber,
				runningShiftName: oInputData.runningShiftName,
				runningBusinessDate: oInputData.runningBusinessDate,
				shiftFromTime: oInputData.shiftFromTime,
				shiftToTime: oInputData.shiftToTime,
				plantRegionCode: oInputData.plantRegionCode,
				plantRegionName: oInputData.plantRegionName,
				orderDate: oInputData.orderDate,
				orderCancellationDate: null,
				plantCode: oInputData.plantCode,
				plantName: oInputData.plantName,
				salesOrganization: oInputData.salesOrganization,
				salesDivChnl: oInputData.salesDivChnl,
				division: oInputData.division,
				orderType: oInputData.orderType,
				customerCode_customerUUID: oInputData.customerCode_customerUUID || null,
				customerName: oInputData.customerName,
				currencyCode: oInputData.currencyCode,
				currencyText: oInputData.currencyText || null,
				orderStatus: oInputData.orderStatus || null,
				paymentDate: oInputData.paymentDate || null,
				paymentUTRNo: oInputData.paymentUTRNo || null,
				orderReferenceNo: oInputData.orderReferenceNo || null,
				orderSyncDate: oInputData.orderSyncDate || null,
				orderSyncedMessage: oInputData.orderSyncedMessage,
				orderCreatedByCode: oInputData.orderCreatedByCode,
				orderCreatedByUser: oInputData.orderCreatedByUser,
				orderSyncedS4: oInputData.orderSyncedS4,
				s4Indicator: oInputData.s4Indicator,
				VehOrdInspDetails: [],
				vehRepInfo: oCustomerInfoModel.getProperty("/CustomerInfo")
			};

			const aVehicleDetails = oInputData.VehOrdInspDetails || [];
			aVehicleDetails.forEach(oVehicle => {
				const oVehiclePayload = {
					vehicleOrderInspectionDetailsUUID: oVehicle.vehicleOrderInspectionDetailsUUID || null,
					VehicleDetails_vehicleMastersUUID: oVehicle.VehicleDetails_vehicleMastersUUID,
					plateNumber: oVehicle.plateNumber,
					plantCode: oInputData.plantCode,
					plateColor: oVehicle.plateColor,
					plateSource: oVehicle.plateSource,
					inspectionByCode: oVehicle.inspectionByCode,
					inspectionByUser: oVehicle.inspectionByUser,
					plateKind: oVehicle.plateKind,
					laneTypeCode: oVehicle.laneTypeCode,
					laneCode: oVehicle.laneCode,
					inspectionStartDateTime: null,
					inspectionCompletedDateTime: null,
					status: null,
					lockedBy: null,
					lockedByDateTime: null,
					onHoldDateTime: null,
					VehicleOrderInspectionLaneChangeDetails: [],
					vehOrdInspLines: []
				};

				const aLines = oVehicle.vehOrdInspLines.results || [];
				aLines.forEach(oLine => {
					const oLinePayload = {
						orderLineNo: oLine.orderLineNo,
						materialCode: oLine.materialCode,
						materialName: oLine.materialName,
						materialNameArabic: oLine.materialNameArabic || null,
						materialType: oLine.materialType,
						materialGroup: oLine.materialGroup,
						inspectionType: oLine.inspectionType || null,
						quantity: oLine.quantity,
						unitPrice: oLine.unitPrice.toString(),
						vatCode: oLine.vatCode,
						vatPercent: oLine.vatPercent,
						inspectionByUser: oLine.inspectionByUser,
						inspectionByCode: oLine.inspectionByCode,
						discountAmount: oLine.discountAmount,
						vat: oLine.vat.toString(),
						currencyCode: oLine.currencyCode,
						LineIndicator: oLine.LineIndicator,
						currencyText: oLine.currencyText || "",
						lineTotal: oLine.lineTotal.toString(),
						totalWithVAT: oLine.totalWithVAT.toString(),
						totalWithOutVAT: oLine.totalWithOutVAT.toString(),
						vehicleOrderInspectionPricing: [],
						vehicleOrderCoupans: [],
						vehOrdInspLinesTestChars: []
					};

					const aTestChars = oLine.vehOrdInspLinesTestChars || [];
					aTestChars.forEach(oTest => {
						oLinePayload.vehOrdInspLinesTestChars.push({
							VehicleOrderInspectionLinesTestCharUUID: oTest.VehicleOrderInspectionLinesTestCharUUID || null,
							testInspectedBy: oTest.testInspectedBy || null,
							testInspectedByCode: oTest.testInspectedByCode || null,
							testInspectionEndDate: oTest.testInspectionEndDate || null,
							testInspectionStartDate: oTest.testInspectionStartDate || null,
							testStatus: oTest.testStatus || Constant.STATUS.OPEN,
							applicableTestName: oTest.applicableTestName
						});
					});

					const aInspectionPricing = oLine.vehicleOrderInspectionPricing || [];
					aInspectionPricing.forEach(oPricing => {
						oLinePayload.vehicleOrderInspectionPricing.push({
							condType: oPricing.condType,
							condValue: parseFloat(oPricing.condValue || 0)
						});
					});

					const aInspectionCoupon = oLine.vehicleOrderCoupans || [];
					aInspectionCoupon.forEach(oCoupon => {
						oLinePayload.vehicleOrderCoupans.push({
							vehicleOrderInspectionLines_vehicleOrderInspectionLines: oCoupon.vehicleOrderInspectionLines,
							couponNumber: oCoupon.couponNumber,
							condType: oCoupon.condType,
							condValue: oCoupon.condValue,
							condCurrency: oCoupon.condCurrency
						});
					});


					oVehiclePayload.vehOrdInspLines.push(oLinePayload);

				});

				oPayload.VehOrdInspDetails.push(oVehiclePayload);
			});

			return oPayload;
		},

		/**
		 * Final Funciton Call to Update Payload for Accessories 
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
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
			if (hasAccessories) {
				// Optional: Update all line indicators to "C"
				oPayload.VehOrdInspDetails.forEach(vehicle => {
					vehicle.vehOrdInspLines.forEach(line => {
						line.LineIndicator = Constant.AsseccLineIndicator;
					});
				});
			} else if (hasService) {
				// Optional: set service-specific indicator
				oPayload.VehOrdInspDetails.forEach(vehicle => {
					vehicle.vehOrdInspLines.forEach(line => {
						line.LineIndicator = Constant.LineIndicator;
					});
				});
			}

			return oPayload;
		},

		/**
	   * Function for Update Sales Order
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	   * @version 1.0.0
	   * @since 10.02.2025
	   * @fires onBtnPressUpdateSalesOrder,validatePayment
	   * @author MM
	   */


		onBtnPressUpdateSalesOrder: async function (process) {

			let oButtonModel = this.getView().getModel("ButtonVisibleModel");
			const oGlobalResModel = this.getView().getModel("oGlobalModel");
			const oSalesOrderRes = oGlobalResModel.getProperty("/OrderResponse");
			const oOrderResData = oGlobalResModel.getProperty("/MaterialPayload");
			const soCardModel = this.getView().getModel("SalesOrderCardDataModel");
			let updatedServiceItems = soCardModel.getProperty("/MyCartItems") || [];
			let isServicePage = oGlobalResModel.getProperty("/isServicePage")
			const aVehicleDetails = oOrderResData.VehOrdInspDetails || [];
			let oGroupedItemsByPlate = {};
			// Group materials by plate number
			if (isServicePage) {
				updatedServiceItems.forEach(item => {
					const sUpdatedPlateNum = item.PlateNo;
					if (!oGroupedItemsByPlate[sUpdatedPlateNum]) {
						oGroupedItemsByPlate[sUpdatedPlateNum] = [];
					}
					oGroupedItemsByPlate[sUpdatedPlateNum].push(item);
				});
			}

			var aChildInspLines = [];
			oSalesOrderRes.VehOrdInspDetails.results.forEach((detail) => {
				detail.vehOrdInspLines.results.forEach((line) => {
					aChildInspLines.push({
						currVehicleOrderInspectionLines: line.vehicleOrderInspectionLines,
					});
				});
			})

			// Iterate and update each vehicle
			aVehicleDetails.forEach(vehicle => {
				const sVehDetailPlate = vehicle.plateNumber;
				const aNewItems = isServicePage ? oGroupedItemsByPlate[sVehDetailPlate] : updatedServiceItems || [];

				const oUpdatedLines = aNewItems.map((item, index) => ({
					orderLineNo: String((index + 1) * 10),
					materialCode: item.Material || null,
					materialName: item.ServiceName || null,
					materialNameArabic: item.materialNameArabic || null,
					materialType: item.MaterialType || null,
					materialGroup: item.MaterialGroup || null,
					inspectionByUser: oGlobalResModel.getProperty("/EmployeeData/empNameEnglish"),
					inspectionByCode: oGlobalResModel.getProperty("/EmployeeData/empCode"),
					inspectionType: null,
					vatCode: item.VatCode,
					discountAmount: item.DiscountAmount,
					vatPercent: item.VATPercentage,
					quantity: parseInt(item.Qty) || 1,
					unitPrice: parseFloat(item.Price || 0).toFixed(2),
					vat: parseFloat(item.VAT || 0).toFixed(2),
					currencyCode: item.ContCurrency || Constant.CURRENCY.CURRENCYCODE,
					currencyText: item.currencyText || "",
					lineTotal: parseFloat(item.TotalAmount || 0).toFixed(2),
					totalWithVAT: parseFloat(item.TotalAmount || 0).toFixed(2),
					totalWithOutVAT: parseFloat(item.TotalWithOutVAT || 0).toFixed(2),
					vehOrdInspLinesTestChars: (item.vehOrdInspLinesTestChars || []).map(testChar => ({
						VehicleOrderInspectionLinesTestCharUUID: testChar.MATERIALCHARACTERISTICUUID,
						testInspectedBy: oGlobalResModel.getProperty("/EmployeeData/empNameEnglish"),
						testInspectedByCode: oGlobalResModel.getProperty("/EmployeeData/empCode"),
						testInspectionEndDate: null,
						testInspectionStartDate: null,
						testStatus: Constant.STATUS.OPEN,
						applicableTestName: testChar.INTERNALCHARNO
					})),
					vehicleOrderInspectionPricing: (item.to_ConditionType || []).map(iPricing => ({
						condType: iPricing.CONDITIONTYPE,
						condValue: parseFloat(iPricing.PRICE || 0)
					})),

					vehicleOrderCoupans: (item.vehicleOrderCoupans || []).map(iCoupon => ({
						vehicleOrderInspectionLines_vehicleOrderInspectionLines: aChildInspLines[0].currVehicleOrderInspectionLines,
						couponNumber: iCoupon.couponNumber,
						condType: iCoupon.condType,
						condValue: iCoupon.condValue,
						condCurrency: iCoupon.condCurrency
					})),
				}));

				vehicle.vehOrdInspLines.results = oUpdatedLines;

			});


			// Update back to model before payload transformation
			oOrderResData.VehOrdInspDetails = aVehicleDetails;

			const iTotalOrderAmount = parseFloat(soCardModel.getProperty("/OrderTotal") || 0);
			const iDiscountAmount = parseFloat(soCardModel.getProperty("/DiscountAmount") || 0);
			const iSubTotalAfterDis = parseFloat(soCardModel.getProperty("/SubTotalAfterDis") || 0);
			const iSubTotal = parseFloat(soCardModel.getProperty("/TotalAmount") || 0);
			const iTotalVatAmount = parseFloat(soCardModel.getProperty("/VatAmount") || 0);

			if (iTotalOrderAmount === 0) {
				this.validatePayment(iTotalOrderAmount);
				return;
			}

			const oTransformedPayload = this.createOrderPayload(oOrderResData);
			oTransformedPayload.vehicleOrderInspectionUUID = oSalesOrderRes.vehicleOrderInspectionUUID;
			oTransformedPayload.orderTotal = iTotalOrderAmount;
			oTransformedPayload.totalVAT = iTotalVatAmount;
			oTransformedPayload.discountValue = iDiscountAmount;
			oTransformedPayload.orderSubTotal = iSubTotal;
			oTransformedPayload.orderSubTotalAfterDiscount = iSubTotalAfterDis;

			let updatedPayload = this.changeAccessoreisOrderPayload(oTransformedPayload);
			console.log(updatedPayload);

			if (process === PaymentConstant.FlagRepres) {
				await this.onBtnPressSaveRepresAttachment();
				let oResAttachModel = this.getView().getModel("RespoAttachmentModel").getData();
				soCardModel.setProperty("/CustomerInfo/AttachmentId_attachmentGuId", oResAttachModel.results[0].attachmentGuId);
			}

			try {
				await this.saveEntryForm(
					Constant.PATCH,
					`/VehicleOrderInspections(guid'${oSalesOrderRes.vehicleOrderInspectionUUID}')?$expand=VehOrdInspDetails($expand=vehOrdInspLines($expand=vehOrdInspLinesTestChars))`,
					updatedPayload
				);

				const oResponse = this.getApiResponseObject();
				if (oResponse?.success) {
					const oResultModel = new JSONModel(oResponse.object);
					this.getOwnerComponent().setModel(oResultModel, "GetSalesOrderResponse");
					const sMessage = this.oBundle.getText("salesOrder_messageToastServiceUpdated", [oSalesOrderRes.serviceRequestNo]);

					MessageToast.show(`${sMessage}`, { duration: 5000 });
					oButtonModel.setProperty("/UpdatebtnVisible", false);

					if (oResultModel != undefined && process === PaymentConstant.FlagRepres) {
						await this.patchAttachmentDataRepres();
						await this.onBtnPressProceed();
					}

					if (process === PaymentConstant.simulate) {
						this.onPressRedeemLoyalty();
					}


				} else {
					let sRes = JSON.parse(oResponse.object.responseText);
					MessageBox.error(sRes.error?.message?.value);
				}
			} catch (err) {
				MessageBox.error(this.oBundle.getText("payment_messageBoxFailedtoupdatesalesorder"));
			}
		},

		/**
	   * Function for Show Update Button
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	   * @version 1.0.0
	   * @since 10.02.2025
	   * @fires _getUpdateSalesOrderStatus
	   * @author MM
	   */

		_getUpdateSalesOrderStatus: function () {
			let oModel = new JSONModel({
				UpdatebtnVisible: true
			});

			this.getView().setModel(oModel, "ButtonVisibleModel");
		},

		/**
	   * Function for Calculate Grand Total
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	   * @version 1.0.0
	   * @since 10.02.2025
	   * @fires _getCalculatedTotal
	   * @author MM
	   */

		_getCalculatedTotal: function () {
			let iGrandTotal = 0;
			let iSubTotalAfterDis = 0;
			let iTotalDiscount = 0;
			let iSubTotal = 0;
			let iTotalVat = 0;
			let oMaterialModel = this.getView().getModel("SalesOrderCardDataModel");
			let oMaterialData = oMaterialModel.getData();

			oMaterialData.MyCartItems.forEach((item) => {
				iGrandTotal = oMaterialData.MyCartItems.reduce((sum, item) => sum + (parseFloat(item.Price) || 0), 0);
				iSubTotalAfterDis = oMaterialData.MyCartItems.map(o => parseFloat(o.SubTotalAfterDis || 0)).reduce((a, c) => a + c, 0);
				iTotalDiscount = oMaterialData.MyCartItems.map(o => parseFloat(o.DiscountAmount || 0)).reduce((a, c) => a + c, 0);
				iTotalVat = oMaterialData.MyCartItems.map(o => parseFloat(o.VAT || 0)).reduce((a, c) => a + c, 0);
				iSubTotal = oMaterialData.MyCartItems.map(o => parseFloat(o.iGrandTotal || 0)).reduce((a, c) => a + c, 0);
			})

			oMaterialModel.setProperty("/SubTotal", parseFloat(iGrandTotal).toFixed(2));
			oMaterialModel.setProperty("/DiscountAmount", parseFloat(iTotalDiscount).toFixed(2));
			oMaterialModel.setProperty("/SubTotalAfterDis", parseFloat(iSubTotalAfterDis).toFixed(2));
			oMaterialModel.setProperty("/VatAmount", parseFloat(iTotalVat).toFixed(2));
			oMaterialModel.setProperty("/OrderTotal", parseFloat(iSubTotalAfterDis).toFixed(2));
		},

		/**
	   * Function for Validation for Payment 
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	   * @version 1.0.0
	   * @since 10.02.2025
	   * @fires validatePayment
	   * @author MM
	   */

		validatePayment: function (iTotalAmount) {
			if (iTotalAmount === PaymentConstant.ArrayZeroLength) {
				let oMaterialModel = this.getView().getModel("SalesOrderCardDataModel");
				oMaterialModel.setProperty("/OrderTotal", iTotalAmount);
				MessageBox.warning(this.oBundle.getText("payment_messageBoxGrandTotalAmount"));
				return;
			}

		},

		/**
	   * Function for Validation for Qty 
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	   * @version 1.0.0
	   * @since 10.02.2025
	   * @fires _validateQty
	   * @author MM
	   */

		_validateQty: function (iQuantity) {
			if (iQuantity === PaymentConstant.ArrayZeroLength) {
				MessageBox.warning(this.oBundle.getText("payment_messageBoxQuantityCannotzero"));
				return;
			}
		},

		/**
		 * Function triggered when cash mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressCashSelect: function (oEvent) {
			var Seleted = oEvent.getSource().getSelected();
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			if (Seleted) {
				oServicesViewModel.setProperty("/CashMOPPanelExpand", true);
				var aaniPayAmount = oServicesViewModel.getProperty("/AaniPayAmount");
				var cardamount = oServicesViewModel.getProperty("/CardAmount");
				var loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
				var couponamount = oServicesViewModel.getProperty("/CouponAmount");
				var walletAmount = oServicesViewModel.getProperty("/WalletAmount");

				if (cardamount === "") {
					cardamount = PaymentConstant.initialiseZero;
				}
				if (aaniPayAmount === "") {
					aaniPayAmount = PaymentConstant.initialiseZero;
				}
				if (loyaltyamount === "") {
					loyaltyamount = PaymentConstant.initialiseZero;
				}
				if (couponamount === "") {
					couponamount = PaymentConstant.initialiseZero;
				}
				if (walletAmount === "") {
					walletAmount = PaymentConstant.initialiseZero;
				}

				var soamount = oServicesViewModel.getProperty("/MyCartTotal");
				var Total = parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletAmount) + parseFloat(aaniPayAmount);
				var Balance = parseFloat(soamount) - parseFloat(Total);
				oServicesViewModel.setProperty("/Cashamount", parseFloat(Balance).toFixed(2));

			} else {
				oServicesViewModel.setProperty("/CashMOPPanelExpand", false);
				// reset amount 
				oServicesViewModel.setProperty("/Cashamount", PaymentConstant.initialiseZero);
			}
			oServicesViewModel.refresh();
		},

		/**
		 * Function triggered when Card mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressCardSelect: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var Seleted = oEvent.getSource().getSelected();
			if (Seleted) {
				let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
				oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);
				oServicesViewModel.setProperty("/CardMOPPanelExpand", true);

				var cashamount = oServicesViewModel.getProperty("/Cashamount");
				var aaniPayAmount = oServicesViewModel.getProperty("/AaniPayAmount");
				var loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
				var couponamount = oServicesViewModel.getProperty("/CouponAmount");
				var walletAmount = oServicesViewModel.getProperty("/WalletAmount");

				if (cashamount === "") {
					cashamount = PaymentConstant.initialiseZero;
				}
				if (aaniPayAmount === "") {
					aaniPayAmount = PaymentConstant.initialiseZero;
				}
				if (loyaltyamount === "") {
					loyaltyamount = PaymentConstant.initialiseZero;
				}
				if (couponamount === "") {
					couponamount = PaymentConstant.initialiseZero;
				}
				if (walletAmount === "") {
					walletAmount = PaymentConstant.initialiseZero;
				}

				if (parseFloat(aaniPayAmount) > Constant.ArrayZeroLength) {  // condition to check if aanipay mop is selected, because either card or Aani pay mop is possible per transaction added on 17-07-25
					MessageToast.show(this.oBundle.getText("msgBankAani"));
					oServicesViewModel.setProperty("/CardMOPPanelExpand", false);
					oServicesViewModel.setProperty("/Card_CheckBoxSeleted", false);
					oServicesViewModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);

				} else {
					var soamount = oServicesViewModel.getProperty("/MyCartTotal");
					var Total = parseFloat(cashamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletAmount) + parseFloat(aaniPayAmount);
					var Balance = parseFloat(soamount) - parseFloat(Total);
					if (Balance == PaymentConstant.ArrayZeroLength) {
						MessageToast.show(this.oBundle.getText("MOPAmountMatched"));
						oServicesViewModel.setProperty("/CardMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Card_CheckBoxSeleted", false);
						oServicesViewModel.setProperty("/CardAmount", parseFloat(Balance).toFixed(2));
					} else {
						oServicesViewModel.setProperty("/CardAmount", parseFloat(Balance).toFixed(2));
					}

				}
			} else {
				oServicesViewModel.setProperty("/CardMOPPanelExpand", false);
				// reset amount 
				oServicesViewModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);
			}
			oServicesViewModel.refresh();

		},

		/**
		 * Function triggered when Aani Pay mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */

		onPressAanipaySelect: function (oEvent) {
			var Seleted = oEvent.getSource().getSelected();
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			if (Seleted) {
				let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
				oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);
				oServicesViewModel.setProperty("/AanipayMOPPanelExpand", true);

				var cashamount = oServicesViewModel.getProperty("/Cashamount");
				var cardamount = oServicesViewModel.getProperty("/CardAmount");
				var loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
				var couponamount = oServicesViewModel.getProperty("/CouponAmount");
				var walletAmount = oServicesViewModel.getProperty("/WalletAmount");

				if (cashamount === "") {
					cashamount = PaymentConstant.initialiseZero;
				}
				if (cardamount === "") {
					cardamount = PaymentConstant.initialiseZero;
				}
				if (loyaltyamount === "") {
					loyaltyamount = PaymentConstant.initialiseZero;
				}
				if (couponamount === "") {
					couponamount = PaymentConstant.initialiseZero;
				}
				if (walletAmount === "") {
					walletAmount = PaymentConstant.initialiseZero;
				}

				let soamount = oServicesViewModel.getProperty("/MyCartTotal");
				let Total = parseFloat(cashamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletAmount) + parseFloat(cardamount);
				let Balance = parseFloat(soamount) - parseFloat(Total);
				oServicesViewModel.setProperty("/AaniPayAmount", parseFloat(Balance).toFixed(2));

			} else {
				oServicesViewModel.setProperty("/AanipayMOPPanelExpand", false);
				// reset amount 
				oServicesViewModel.setProperty("/AaniPayAmount", PaymentConstant.initialiseZero);
			}
			oServicesViewModel.refresh();

		},

		/**
		 * Function triggered when Loyalty mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
		 * @author MM
		 */
		onPressLoyaltySelect: function (oEvent) {
			var Seleted = oEvent.getSource().getSelected();
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			if (Seleted) {
				let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
				oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);
				oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", true);

				let cashamount = oServicesViewModel.getProperty("/Cashamount");
				let cardamount = oServicesViewModel.getProperty("/CardAmount");
				let aaniPayAmount = oServicesViewModel.getProperty("/AaniPayAmount");
				let couponamount = oServicesViewModel.getProperty("/CouponAmount");
				let walletAmount = oServicesViewModel.getProperty("/WalletAmount");

				let soamount = oServicesViewModel.getProperty("/MyCartTotal");
				let Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(couponamount) + parseFloat(walletAmount) + parseFloat(aaniPayAmount);
				let Balance = parseFloat(soamount) - parseFloat(Total);
				oServicesViewModel.setProperty("/Loyaltyamount", parseFloat(Balance).toFixed(2));


			} else {
				oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
				// reset amount 
				oServicesViewModel.setProperty("/Loyaltyamount", PaymentConstant.initialiseZero);
			}
			oServicesViewModel.refresh();
		},

		/**
		 * Function triggered when coupon mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressCouponselect: function (oEvent) {
			var Seleted = oEvent.getSource().getSelected();
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			if (Seleted) {
				oServicesViewModel.setProperty("/CouponMOPPanelExpand", true);
				let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
				oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);

				let cashamount = oServicesViewModel.getProperty("/Cashamount");
				let cardamount = oServicesViewModel.getProperty("/CardAmount");
				let loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
				let walletAmount = oServicesViewModel.getProperty("/WalletAmount");

				if (cashamount === "") {
					cashamount = PaymentConstant.initialiseZero;
				}
				if (aaniPayAmount === "") {
					aaniPayAmount = PaymentConstant.initialiseZero;
				}
				if (loyaltyamount === "") {
					loyaltyamount = PaymentConstant.initialiseZero;
				}
				if (cardamount === "") {
					cardamount = PaymentConstant.initialiseZero;
				}
				if (walletAmount === "") {
					walletAmount = PaymentConstant.initialiseZero;
				}

				let soamount = oServicesViewModel.getProperty("/MyCartTotal");
				let Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(walletAmount);
				let Balance = parseFloat(soamount) - parseFloat(Total);
				oServicesViewModel.setProperty("/CouponAmount", parseFloat(Balance).toFixed(2));

			} else {
				oServicesViewModel.setProperty("/CouponMOPPanelExpand", false);
				// reset amount 
				oServicesViewModel.setProperty("/CouponAmount", PaymentConstant.initialiseZero);
			}
			oServicesViewModel.refresh();
		},

		/**
		 * Function triggered when wallet mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressWalletselect: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var Seleted = oEvent.getSource().getSelected();
			if (Seleted) {
				oServicesViewModel.setProperty("/WalletMOPPanelExpand", true);
				let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
				oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);

				let cashamount = oServicesViewModel.getProperty("/Cashamount");
				let cardamount = oServicesViewModel.getProperty("/CardAmount");
				let loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
				let couponamount = oServicesViewModel.getProperty("/CouponAmount");
				let aaniPayAmount = oServicesViewModel.getProperty("/AaniPayAmount");
				let soamount = oServicesViewModel.getProperty("/MyCartTotal");
				let sPartialPaymentFlag = oServicesViewModel.getProperty("/PartialPaymentFlag");
				if (sPartialPaymentFlag) {
					soamount = oServicesViewModel.getProperty("/BalancetoPay");
				}
				let Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(aaniPayAmount);
				let Balance = parseFloat(soamount) - parseFloat(Total);
				oServicesViewModel.setProperty("/WalletAmount", parseFloat(Balance).toFixed(2));

			} else {
				oServicesViewModel.setProperty("/WalletMOPPanelExpand", false);
				// reset amount 
				oServicesViewModel.setProperty("/WalletAmount", PaymentConstant.initialiseZero);
			}
			oServicesViewModel.refresh();
		},

		/**
		 * Function triggered when cash mop panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires - onExpandCash, 
		 * @author MM
		 */

		onExpandCash: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var expan = oEvent.getSource().getExpanded();
			if (expan) {
				let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
				oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);
				oServicesViewModel.setProperty("/Cash_CheckBoxSeleted", true);
				let cardamount = oServicesViewModel.getProperty("/CardAmount");
				let loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
				let couponamount = oServicesViewModel.getProperty("/CouponAmount");
				let aaniPayAmount = oServicesViewModel.getProperty("/AaniPayAmount");
				let walletAmount = oServicesViewModel.getProperty("/WalletAmount");

				if (cardamount === "") {
					cardamount = PaymentConstant.initialiseZero;
				}
				if (aaniPayAmount === "") {
					aaniPayAmount = PaymentConstant.initialiseZero;
				}
				if (loyaltyamount === "") {
					loyaltyamount = PaymentConstant.initialiseZero;
				}
				if (couponamount === "") {
					couponamount = PaymentConstant.initialiseZero;
				}
				if (walletAmount === "") {
					walletAmount = PaymentConstant.initialiseZero;
				}

				let soamount = oServicesViewModel.getProperty("/MyCartTotal");
				let Total = parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(aaniPayAmount) + parseFloat(walletAmount);
				let Balance = parseFloat(soamount) - parseFloat(Total);
				if (Balance == PaymentConstant.ArrayZeroLength) {
					MessageToast.show(this.oBundle.getText("MOPAmountMatched"));
					oServicesViewModel.setProperty("/CashMOPPanelExpand", false);
					oServicesViewModel.setProperty("/Cash_CheckBoxSeleted", false);
					oServicesViewModel.setProperty("/Cashamount", parseFloat(Balance).toFixed(2));
				} else {
					oServicesViewModel.setProperty("/Cashamount", parseFloat(Balance).toFixed(2));
					// collapsing the panel which doesn't have any amount in the input field 18-07-25
					if (parseFloat(cardamount) === Constant.ArrayZeroLength) {
						oServicesViewModel.setProperty("/CardMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Card_CheckBoxSeleted", false);
					}
					if (parseFloat(aaniPayAmount) === Constant.ArrayZeroLength) {
						oServicesViewModel.setProperty("/AanipayMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Aanipay_CheckBoxSeleted", false);
					}
					if (parseFloat(walletAmount) === Constant.ArrayZeroLength) {
						oServicesViewModel.setProperty("/WalletMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Wallet_CheckBoxSeleted", false);
					}
					if (parseFloat(loyaltyamount) === Constant.ArrayZeroLength) {
						oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
					}
				}



			} else {
				oServicesViewModel.setProperty("/Cash_CheckBoxSeleted", false);
				// reset amount 
				oServicesViewModel.setProperty("/Cashamount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered when card mop panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires - onExpandCard, 
		 * @author MM
		 */

		onExpandCard: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var expan = oEvent.getSource().getExpanded();
			if (expan) {
				let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
				oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);
				oServicesViewModel.setProperty("/Card_CheckBoxSeleted", true);
				let cashamount = oServicesViewModel.getProperty("/Cashamount");
				let aaniPayAmount = oServicesViewModel.getProperty("/AaniPayAmount");
				let loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
				let couponamount = oServicesViewModel.getProperty("/CouponAmount");
				let walletAmount = oServicesViewModel.getProperty("/WalletAmount");

				if (cashamount === "") {
					cashamount = PaymentConstant.initialiseZero;
				}
				if (aaniPayAmount === "") {
					aaniPayAmount = PaymentConstant.initialiseZero;
				}
				if (loyaltyamount === "") {
					loyaltyamount = PaymentConstant.initialiseZero;
				}
				if (couponamount === "") {
					couponamount = PaymentConstant.initialiseZero;
				}
				if (walletAmount === "") {
					walletAmount = PaymentConstant.initialiseZero;
				}

				if (parseFloat(aaniPayAmount) > Constant.ArrayZeroLength) {  // condition to check if aanipay mop is selected, because either card or Aani pay mop is possible per transaction added on 17-07-25
					MessageToast.show(this.oBundle.getText("msgBankAani"));
					oServicesViewModel.setProperty("/CardMOPPanelExpand", false);
					oServicesViewModel.setProperty("/Card_CheckBoxSeleted", false);
					oServicesViewModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);

				} else {

					let soamount = oServicesViewModel.getProperty("/MyCartTotal");
					let Total = parseFloat(cashamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(aaniPayAmount) + parseFloat(walletAmount);
					let Balance = parseFloat(soamount) - parseFloat(Total);

					if (Balance == PaymentConstant.ArrayZeroLength) {
						MessageToast.show(this.oBundle.getText("MOPAmountMatched"));
						oServicesViewModel.setProperty("/CardMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Card_CheckBoxSeleted", false);
						oServicesViewModel.setProperty("/CardAmount", parseFloat(Balance).toFixed(2));
					} else {
						oServicesViewModel.setProperty("/CardAmount", parseFloat(Balance).toFixed(2));
						if (parseFloat(cashamount) === Constant.ArrayZeroLength) { // collapsing the panel which doesn't have any amount in the input field
							oServicesViewModel.setProperty("/CashMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Cash_CheckBoxSeleted", false);
						}
						if (parseFloat(aaniPayAmount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/AanipayMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Aanipay_CheckBoxSeleted", false);
						}
						if (parseFloat(walletAmount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/WalletMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Wallet_CheckBoxSeleted", false);
						}
						if (parseFloat(loyaltyamount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
						}
					}

				}

			} else {
				oServicesViewModel.setProperty("/Card_CheckBoxSeleted", false);
				//Reset amount
				oServicesViewModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered when AaniPay mop panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires - onExpandAaniPay, 
		 * @author MM
		 */

		onExpandAaniPay: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var expan = oEvent.getSource().getExpanded();
			if (expan) {
				let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
				oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);
				oServicesViewModel.setProperty("/Aanipay_CheckBoxSeleted", true);

				let cashamount = oServicesViewModel.getProperty("/Cashamount");
				let cardamount = oServicesViewModel.getProperty("/CardAmount");
				let loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
				let couponamount = oServicesViewModel.getProperty("/CouponAmount");
				let walletAmount = oServicesViewModel.getProperty("/WalletAmount");
				if (cashamount === "") {
					cashamount = PaymentConstant.initialiseZero;
				}
				if (cardamount === "") {
					cardamount = PaymentConstant.initialiseZero;
				}
				if (loyaltyamount === "") {
					loyaltyamount = PaymentConstant.initialiseZero;
				}
				if (couponamount === "") {
					couponamount = PaymentConstant.initialiseZero;
				}
				if (walletAmount === "") {
					walletAmount = PaymentConstant.initialiseZero;
				}

				if (parseFloat(cardamount) > Constant.ArrayZeroLength) { // condition to check if Card mop is selected, because either card or Aani pay mop is possible per transaction added on 17-07-25
					MessageToast.show(this.oBundle.getText("msgBankAani"));
					oServicesViewModel.setProperty("/AanipayMOPPanelExpand", false);
					oServicesViewModel.setProperty("/Aanipay_CheckBoxSeleted", false);
					oServicesViewModel.setProperty("/AaniPayAmount", PaymentConstant.initialiseZero);

				} else {

					let soamount = oServicesViewModel.getProperty("/MyCartTotal");
					let Total = parseFloat(cashamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(cardamount) + parseFloat(walletAmount);
					let Balance = parseFloat(soamount) - parseFloat(Total);

					if (Balance == PaymentConstant.ArrayZeroLength) {
						MessageToast.show(this.oBundle.getText("MOPAmountMatched"));
						oServicesViewModel.setProperty("/AanipayMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Aanipay_CheckBoxSeleted", false);
						oServicesViewModel.setProperty("/AaniPayAmount", parseFloat(Balance).toFixed(2));
					} else {
						oServicesViewModel.setProperty("/AaniPayAmount", parseFloat(Balance).toFixed(2));
						if (parseFloat(cashamount) === Constant.ArrayZeroLength) { // collapsing the panel which doesn't have any amount in the input field
							oServicesViewModel.setProperty("/CashMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Cash_CheckBoxSeleted", false);
						}
						if (parseFloat(cardamount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/CardMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Card_CheckBoxSeleted", false);
						}
						if (parseFloat(walletAmount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/WalletMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Wallet_CheckBoxSeleted", false);
						}
						if (parseFloat(loyaltyamount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
						}
					}
				}

			} else {
				oServicesViewModel.setProperty("/Aanipay_CheckBoxSeleted", false);
				//Reset amount
				oServicesViewModel.setProperty("/AaniPayAmount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered when card loyalty panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires - onExpandLoyalty, 
		 * @author MM
		 */
		onExpandLoyalty: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var expan = oEvent.getSource().getExpanded();
			if (expan) {
				let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
				oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);
				oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", true);
			} else {
				oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
			}
		},


		/**
		 * Function triggered when we select Card mop.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.Refund
		 * @version 1.0.0
		 * @since 26.03.2025
		 * @fires - onExpandLoyaltyNew
		 * @author MM
		 */
		onExpandLoyaltyNew: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var LoyaltyID = this.getView().getModel("oGlobalModel").getProperty("/LoyaltyID");
			var SO_Number = oServicesViewModel.getProperty("/SO_Number");
			if (!LoyaltyID && SO_Number !== PaymentConstant.Notstarted) {
				oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
				oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
				//MessageToast.show(this.oBundle.getText("home_messageToastScanLoyaltyId"));
				this.onPressCheckCard();
			} else {

				// Function common form Panel and check box for the loyalty MOP
				var oSource = oEvent.getSource();
				if (oSource.isA("sap.m.Panel")) {
					var Seleted = oSource.getExpanded();
				} else if (oSource.isA("sap.m.CheckBox")) {
					var Seleted = oSource.getSelected();
				}

				if (Seleted) {
					if (oSource.isA("sap.m.Panel")) {
						let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
						oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);
						oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", true);
						oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", true);

					} else if (oSource.isA("sap.m.CheckBox")) {
						oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", true);
						oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", true);
					}

					let cashamount = oServicesViewModel.getProperty("/Cashamount");
					let cardamount = oServicesViewModel.getProperty("/CardAmount");
					let aaniPayAmount = oServicesViewModel.getProperty("/AaniPayAmount");
					let couponamount = oServicesViewModel.getProperty("/CouponAmount");
					let walletamount = oServicesViewModel.getProperty("/WalletAmount");
					if (cashamount === "") {
						cashamount = PaymentConstant.initialiseZero;
					}
					if (cardamount === "") {
						cardamount = PaymentConstant.initialiseZero;
					}
					if (aaniPayAmount === "") {
						aaniPayAmount = PaymentConstant.initialiseZero;
					}
					if (couponamount === "") {
						couponamount = PaymentConstant.initialiseZero;
					}
					if (walletamount === "") {
						walletamount = PaymentConstant.initialiseZero;
					}
					let soamount = oServicesViewModel.getProperty("/MyCartTotal");
					let Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(couponamount) + parseFloat(walletamount) + parseFloat(aaniPayAmount);
					let Balance = parseFloat(soamount) - parseFloat(Total);
					if (Balance == PaymentConstant.ArrayZeroLength) {
						MessageToast.show(this.oBundle.getText("MOPAmountMatched"));
						oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
						oServicesViewModel.setProperty("/Loyaltyamount", parseFloat(Balance).toFixed(2));
					} else {
						oServicesViewModel.setProperty("/Loyaltyamount", parseFloat(Balance).toFixed(2));
						if (parseFloat(cashamount) === Constant.ArrayZeroLength) { // collapsing the panel which doesn't have any amount in the input field
							oServicesViewModel.setProperty("/CashMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Cash_CheckBoxSeleted", false);
						}
						if (parseFloat(cardamount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/CardMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Card_CheckBoxSeleted", false);
						}
						if (parseFloat(aaniPayAmount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/AanipayMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Aanipay_CheckBoxSeleted", false);
						}

					}

				} else {
					if (oSource.isA("sap.m.Panel")) {
						oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
					} else if (oSource.isA("sap.m.CheckBox")) {
						oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
					}
					// reset amount 
					oServicesViewModel.setProperty("/Loyaltyamount", PaymentConstant.initialiseZero);
				}
				oServicesViewModel.refresh();

			}

		},

		/**
		 * Function triggered when card Coupon panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires - onExpandCoupon, 
		 * @author MM
		 */
		onExpandCoupon: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var expan = oEvent.getSource().getExpanded();
			if (expan) {
				let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
				oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);
				oServicesViewModel.setProperty("/Coupon_CheckBoxSeleted", true);
			} else {
				oServicesViewModel.setProperty("/Coupon_CheckBoxSeleted", false);
			}
		},


		/**
		 * Function triggered when wallet Coupon panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onExpandWalletNew: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var oSource = oEvent.getSource();
			if (oSource.isA("sap.m.Panel")) {
				var Seleted = oSource.getExpanded();
			} else if (oSource.isA("sap.m.CheckBox")) {
				var Seleted = oSource.getSelected();
			}
			var oGlobalModel = this.getView().getModel("oGlobalModel").getData();
			if (!oGlobalModel.WalletNumberMask && !oGlobalModel.P24Balance && Seleted) {
				this.onpressScanADNOCPlus();
				oServicesViewModel.setProperty("/WalletMOPPanelExpand", false);
				oServicesViewModel.setProperty("/Wallet_CheckBoxSeleted", false);
				oServicesViewModel.setProperty("/WalletAmount", PaymentConstant.initialiseZero);

			} else {

				if (Seleted) {
					oServicesViewModel.setProperty("/WalletMOPPanelExpand", true);
					oServicesViewModel.setProperty("/Wallet_CheckBoxSeleted", true);

					let sOrderTotal = this.getView().getModel("SalesOrderCardDataModel").getData().OrderTotal;
					oServicesViewModel.setProperty("/MyCartTotal", sOrderTotal);

					let cashamount = oServicesViewModel.getProperty("/Cashamount");
					let cardamount = oServicesViewModel.getProperty("/CardAmount");
					let loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
					let couponamount = oServicesViewModel.getProperty("/CouponAmount");
					let aaniPayAmount = oServicesViewModel.getProperty("/AaniPayAmount");

					if (cashamount === "") {
						cashamount = PaymentConstant.initialiseZero;
					}
					if (cardamount === "") {
						cardamount = PaymentConstant.initialiseZero;
					}
					if (loyaltyamount === "") {
						loyaltyamount = PaymentConstant.initialiseZero;
					}
					if (couponamount === "") {
						couponamount = PaymentConstant.initialiseZero;
					}
					if (aaniPayAmount === "") {
						aaniPayAmount = PaymentConstant.initialiseZero;
					}

					let soamount = oServicesViewModel.getProperty("/MyCartTotal");

					// Check for partialPayment
					let sPartialPaymentFlag = oServicesViewModel.getProperty("/PartialPaymentFlag");
					if (sPartialPaymentFlag) {
						soamount = oServicesViewModel.getProperty("/BalancetoPay");
					}

					let Total = parseFloat(cashamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(cardamount) + parseFloat(aaniPayAmount);
					let Balance = parseFloat(soamount) - parseFloat(Total);
					if (Balance == PaymentConstant.ArrayZeroLength) {
						MessageToast.show(this.oBundle.getText("MOPAmountMatched"));
						oServicesViewModel.setProperty("/WalletMOPPanelExpand", false);
						oServicesViewModel.setProperty("/Wallet_CheckBoxSeleted", false);
						oServicesViewModel.setProperty("/WalletAmount", parseFloat(Balance).toFixed(2));
					} else {
						oServicesViewModel.setProperty("/WalletAmount", parseFloat(Balance).toFixed(2));
						if (parseFloat(cashamount) === Constant.ArrayZeroLength) { // collapsing the panel which doesn't have any amount in the input field
							oServicesViewModel.setProperty("/CashMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Cash_CheckBoxSeleted", false);
						}
						if (parseFloat(cardamount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/CardMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Card_CheckBoxSeleted", false);
						}
						if (parseFloat(aaniPayAmount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/AanipayMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Aanipay_CheckBoxSeleted", false);
						}
						if (parseFloat(loyaltyamount) === Constant.ArrayZeroLength) {
							oServicesViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
							oServicesViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
						}
					}


				} else {
					oServicesViewModel.setProperty("/Wallet_CheckBoxSeleted", false);
					oServicesViewModel.setProperty("/WalletMOPPanelExpand", false);
					oServicesViewModel.setProperty("/WalletAmount", PaymentConstant.initialiseZero);
				}

				oServicesViewModel.refresh();


			}
		},

		/**
		 * Function triggered when wallet mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressWalletANPR: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var Seleted = oEvent.getSource().getSelected();
			if (Seleted) {
				oServicesViewModel.setProperty("/WalletMOPPanelExpandANPR", true);

				let cashamount = oServicesViewModel.getProperty("/Cashamount");
				let cardamount = oServicesViewModel.getProperty("/CardAmount");
				let loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
				let couponamount = oServicesViewModel.getProperty("/CouponAmount");
				let aaniPayAmount = oServicesViewModel.getProperty("/AaniPayAmount");
				let soamount = oServicesViewModel.getProperty("/MyCartTotal");
				let Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(aaniPayAmount);
				let Balance = parseFloat(soamount) - parseFloat(Total);
				oServicesViewModel.setProperty("/WalletAmount", parseFloat(Balance).toFixed(2));

			} else {
				oServicesViewModel.setProperty("/WalletMOPPanelExpandANPR", false);
				// reset amount 
				oServicesViewModel.setProperty("/WalletAmount", PaymentConstant.initialiseZero);
			}
			oServicesViewModel.refresh();
		},




		/**
		 * Function triggered when wallet mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressWalletADNOCPlus: function (oEvent) {
			var oServicesViewModel = this.getView().getModel("ServicesViewModel");
			var Seleted = oEvent.getSource().getSelected();
			if (Seleted) {
				oServicesViewModel.setProperty("/WalletMOPPanelExpandADNOC", true);

				let cashamount = oServicesViewModel.getProperty("/Cashamount");
				let cardamount = oServicesViewModel.getProperty("/CardAmount");
				let loyaltyamount = oServicesViewModel.getProperty("/Loyaltyamount");
				let couponamount = oServicesViewModel.getProperty("/CouponAmount");
				let aaniPayAmount = oServicesViewModel.getProperty("/AaniPayAmount");
				let soamount = oServicesViewModel.getProperty("/MyCartTotal");
				let Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(aaniPayAmount);
				let Balance = parseFloat(soamount) - parseFloat(Total);
				oServicesViewModel.setProperty("/WalletAmount", parseFloat(Balance).toFixed(2));

			} else {
				oServicesViewModel.setProperty("/WalletMOPPanelExpandADNOC", false);
				// reset amount 
				oServicesViewModel.setProperty("/WalletAmount", PaymentConstant.initialiseZero);
			}
			oServicesViewModel.refresh();
		},

		/**
		 * Function triggered check the loyalty card details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires - onPressCheckCard, 
		 * @author MM
		 */
		onPressCheckCard: function () {
			var oGlobalModelRes = this.getView().getModel("oGlobalModel");
			if (!this.RewardCheckFrag) {
				this.RewardCheckFrag = sap.ui.xmlfragment("adnoc.vi.vehicleinspection.modone.fragment.view.RewardCheck", this); // Fragments for Process select
				this.getView().addDependent(this.RewardCheckFrag);
			}
			this.RewardCheckFrag.open();
			oGlobalModelRes.setProperty("/Loyalty_ScanedIDInp", "");
			oGlobalModelRes.setProperty("/Loyalty_ScanedIDManualInp", "");
			this.RewardCheckFrag.attachAfterOpen(() => {
				// Get all content inside the dialog/fragment
				let aControls = this.RewardCheckFrag.findAggregatedObjects(true, (control) => {
					return control.isA("sap.m.Input"); // Find all Input fields
				});

				if (aControls.length > PaymentConstant.ArrayZeroLength) {
					aControls[0].focus(); // Focus the first Input field
				}
			});

			this.onReadKey();

		},

		/**
		 * Function triggered to close loyalty fragment.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires - onPressCloseCheckCard, 
		 * @author MM
		 */
		onPressCloseCheckCard: function () {
			var oGlobalModelRes = this.getView().getModel("oGlobalModel");
			oGlobalModelRes.setProperty("/Loyalty_ScanedIDInp", "");
			oGlobalModelRes.setProperty("/Loyalty_ScanedIDManualInp", "");
			this.RewardCheckFrag.close();

		},

		/**
		 * Function triggered while doing ndc scan successfully.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onScanSuccess
		 * @author MM
		 */
		onScanSuccess: function (oEvent) {
			if (oEvent.getParameter("cancelled")) {
				MessageToast.show(this.oBundle.getText("home_messageToastScanCancelled"), {
					duration: 1000
				});
			} else if (oEvent.getParameter("text")) {
				var scannedvalue = oEvent.getParameter("text");
				scannedvalue = scannedvalue.split("AA1:")[1];
				this._onDecryptLoyaltyId(scannedvalue, PaymentConstant.loyalty);
			} else {
				oScanResultText.setText('');
			}

		},

		/**
		 * Function triggered while doing ndc scan error.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onScanError
		 * @author MM
		 */
		onScanError: function (oEvent) {
			MessageToast.show(this.oBundle.getText("commom_ScanFailed") + oEvent, {
				duration: 1000
			});
		},

		/**
		 * Function triggered when we doing payment.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onSavePayment,_onGetSOdetails,onPressNavtoPaymentapp,onPressNavtoPaymentapp1,_updateOrderstatus(),paymentMessageBox()					
		 * @author MM
		 */
		onSavePayment: async function () {
			await this._getMopData();
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			var oGlobalModelRes = this.getView().getModel("oGlobalModel");
			let oGetSalesOrderModel = this.getOwnerComponent().getModel("GetSalesOrderResponse").getData();
			oServiceModel.setProperty("/SO_UUID", oGetSalesOrderModel.vehicleOrderInspectionUUID);
			oServiceModel.setProperty("/UTRN", oGetSalesOrderModel.orderUTRRefNo);
			oServiceModel.setProperty("/SO_Number", oGetSalesOrderModel.serviceRequestNo);
			oServiceModel.setProperty("/MyCartTotal", oGetSalesOrderModel.orderTotal);

			let sono = oServiceModel.getProperty("/SO_Number");
			let SO_UUID = oServiceModel.getProperty("/SO_UUID");
			let soamount = oServiceModel.getProperty("/MyCartTotal");
			let cashselected = oServiceModel.getProperty("/Cash_CheckBoxSeleted");
			let cardselected = oServiceModel.getProperty("/Card_CheckBoxSeleted");
			let couponselected = oServiceModel.getProperty("/Coupon_CheckBoxSeleted");
			var aanipayselected = oServiceModel.getProperty("/Aanipay_CheckBoxSeleted");
			let loyaltyselected = oServiceModel.getProperty("/Loyalty_CheckBoxSeleted");
			let walletselected = oServiceModel.getProperty("/Wallet_CheckBoxSeleted");
			let cashamount = oServiceModel.getProperty("/Cashamount");
			let cardamount = oServiceModel.getProperty("/CardAmount");
			var aanipayamount = oServiceModel.getProperty("/AaniPayAmount");
			let couponamount = oServiceModel.getProperty("/CouponAmount");
			let loyaltyamount = oServiceModel.getProperty("/Loyaltyamount");
			let walletamount = oServiceModel.getProperty("/WalletAmount");
			let Couponref = oServiceModel.getProperty("/CouponNumber");
			let loyaltyref = oServiceModel.getProperty("/LoyaltyRef");
			var walletAuthcode = oServiceModel.getProperty("/walletAuthcode");
			let cardAuthcode = oServiceModel.getProperty("/Authcode");
			let currentYear = new Date().getFullYear();
			let CLMMessage = oServiceModel.getProperty("/CLMMessage");
			let LoyaltyID = oGlobalModelRes.getProperty("/LoyaltyID");
			let aMOPTypes = oServiceModel.getProperty("/MopTypes");
			let loyaltyAuthcode = oServiceModel.getProperty("/LoyaltyAuthcode");
			var PayerNo = oGlobalModelRes.getProperty("/PayerNo");
			this.oncloseAdnocPluscard();

			if (cashamount === "") {
				cashamount = PaymentConstant.initialiseZero;
			}
			if (cardamount === "") {
				cardamount = PaymentConstant.initialiseZero;
			}
			if (aanipayamount === "") {
				aanipayamount = PaymentConstant.initialiseZero;
			}
			if (loyaltyamount === "") {
				loyaltyamount = PaymentConstant.initialiseZero;
			}
			if (couponamount === "") {
				couponamount = PaymentConstant.initialiseZero;
			}
			if (walletamount === "") {
				walletamount = PaymentConstant.initialiseZero;
			}

			if (CLMMessage == "") {
				CLMMessage = "";
			} else {
				CLMMessage = this.oBundle.getText("loyaltyId") + " " + LoyaltyID + " " + CLMMessage;
			}
			if (walletAuthcode) {
				CLMMessage = CLMMessage + "\n" + this.oBundle.getText("walletTransId") + " " + walletAuthcode;
			}
			let moparr = [];
			let count = PaymentConstant.ArrayZeroLength;
			let cardflag = "";
			let smoptype = "";
			let smopDescription = "";

			if (cashselected === true && parseFloat(cashamount) > PaymentConstant.ArrayZeroLength) {
				var sCashkey = PaymentConstant.cashkey
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sCashkey);

				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}

				count = count + 1;
				let obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": cashamount,
					"mopCode": smoptype,
					"clmMessage": CLMMessage,
					"status": PaymentConstant.SuccessStatus

				};
				moparr.push(obj);
			}
			if (cardselected === true && parseFloat(cardamount) > PaymentConstant.ArrayZeroLength) {
				var sCardkey = PaymentConstant.cardkey;
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sCardkey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}

				cardflag = PaymentConstant.FlagX;
				count = count + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": cardamount,
					"mopCode": smoptype,
					"clmMessage": CLMMessage
				};
				moparr.push(obj);
			}
			if (aanipayselected === true && parseFloat(aanipayamount) > PaymentConstant.ArrayZeroLength) {
				var sCardkey = PaymentConstant.cardkey;
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sCardkey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}

				count = count + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": aanipayamount,
					"mopCode": smoptype,
					"clmMessage": CLMMessage
				};
				moparr.push(obj);
			}
			if (loyaltyselected === true && parseFloat(loyaltyamount) > PaymentConstant.ArrayZeroLength) {
				var sloyaltykey = PaymentConstant.loyaltykey;
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sloyaltykey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}
				count = count + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": loyaltyamount,
					"approvalCode": loyaltyref,
					"mopCode": smoptype,
					"clmMessage": CLMMessage,
					"approvalCode": loyaltyAuthcode,
					"status": PaymentConstant.SuccessStatus
				};
				moparr.push(obj);
			}

			if (couponselected === true && parseFloat(couponamount) > PaymentConstant.ArrayZeroLength) {
				var sCouponkey = PaymentConstant.couponkey;
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sCouponkey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}

				count = count + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": couponamount,
					"approvalCode": Couponref,
					"mopCode": smoptype,
					"clmMessage": CLMMessage,
					"status": PaymentConstant.SuccessStatus


				};
				moparr.push(obj);
			}


			if (walletselected === true && parseFloat(walletamount) > PaymentConstant.ArrayZeroLength) {
				var sCouponkey = PaymentConstant.walletkey;
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sCouponkey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}

				count = count + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": walletamount,
					"mopCode": smoptype,
					"clmMessage": CLMMessage,
					"approvalCode": walletAuthcode,
					"status": PaymentConstant.SuccessStatus,
					"payer": PayerNo

				};
				moparr.push(obj);
			}

			let Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletamount) + parseFloat(aanipayamount);
			var Balance = parseFloat(soamount) - parseFloat(Total);
			if (parseFloat(soamount) === parseFloat(Total)) {

				let payload = {

					"orderNumber": sono.toString(),
					"totalValue": soamount,
					"orderUUID_vehicleOrderInspectionUUID": SO_UUID,
					"year": currentYear,
					"items": moparr
				};
				await this.createNewModelUsingAPI(
					Constant.POST,
					'/PaymentSet',
					payload,
					'PaymentMastersModel'
				);
				let oResponse = this.getApiResponseObject();
				if (oResponse.success) {
					if (cardflag) {
						this.onPressNavtoPaymentapp1();
					} else if (parseFloat(aanipayamount) > PaymentConstant.ArrayZeroLength) {
						this.onPressNavtoPaymentapp();
					}
					else {
						oServiceModel.setProperty("/MOPVisible", false);
						await this._updateOrderstatus();
						this._onGetSOdetails();
						this.paymentMessageBox();
						oServiceModel.setProperty("/MOPVisible", false);

					}

				} else {
					let oRes = JSON.parse(oResponse.object.responseText);
					MessageBox.error(oRes.error?.message?.value);
					return;
				}

			}
			else {
				if (Total === PaymentConstant.ArrayZeroLength) {
					MessageToast.show(this.oBundle.getText("home_messageToastPleaseSelectMOP"));
				} else {
					//  Added to display missed amount on 17-07-2025
					function roundToTwo(num) {
						return Math.round(num * 100) / 100;
					}
					var Balance = roundToTwo(Total - soamount); // MOP Total - Sales Total
					var ModifiedBalance = Math.abs(Balance);
					MessageBox.error(this.oBundle.getText("home_messageToastAmountNotMatch") + " " + ModifiedBalance + " " + this.oBundle.getText("common_BalanceMissing"));
				}
			}
		},

		/**
		 * Function triggered When only Cash will be consider.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires - paymentMessageBox
		 * @author MM
		 */

		paymentMessageBox: async function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			let sono = oServiceModel.getProperty("/SO_Number");
			let CLMMessage = oServiceModel.getProperty("/CLMMessage");
			let LoyaltyID = this.getView().getModel("oGlobalModel").getProperty("/LoyaltyID");
			var walletauthcode = oServiceModel.getProperty("/walletAuthcode");
			if (CLMMessage == "") {
				CLMMessage = "";
			} else {
				CLMMessage = this.oBundle.getText("loyaltyId") + " " + LoyaltyID + " " + CLMMessage;
			}
			if (walletauthcode) {
				CLMMessage = CLMMessage + "\n" + this.oBundle.getText("walletTransId") + " " + walletauthcode;
			}

			let finalMessage =
				this.oBundle.getText("home_messageToastPaymentSuccess1") + " " + sono + " " +
				this.oBundle.getText("home_messageToastPaymentSuccess2") + "\n" + CLMMessage;

			let oMessageModel = new JSONModel({
				finalMessageText: finalMessage
			});
			this.getView().setModel(oMessageModel, "messageModel");

			if (!this._oDialog) {
				this._oDialog = sap.ui.xmlfragment("adnoc.vi.vehicleinspection.modone.fragment.view.PaymentConfirmation", this); // Fragments for Process select
				this.getView().addDependent(this._oDialog);

			}
			this._oDialog.open();
		},

		/**
		 * Function triggered When only Cash will be consider.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onClosePaymentConfirm,_clearMOP,_updateOrderForReTest
		 * @author MM
		 */

		onClosePaymentConfirm: async function () {
			if (this._oDialog) {
				this._clearTabsData();
				let oGlobalModelRes = this.getView().getModel("oGlobalModel");
				oGlobalModelRes.setProperty("/LoyaltyID", "");
				oGlobalModelRes.setProperty("/LoyaltyBal", "");
				oGlobalModelRes.setProperty("/LoyaltyCustName", "");
				oGlobalModelRes.setProperty("/P24Accountnumber", "");
				oGlobalModelRes.setProperty("/P24Balance", "");
				oGlobalModelRes.setProperty("/P24Customer", "");
				oGlobalModelRes.setProperty("/LoyaltyIDMasked", "");
				this.getView().getModel("AccessoriesSearchModel").setData({});
				this.getView().getModel("ServicesViewModel").setProperty("/WalletNumber", "");
				this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				this._oRouter.navTo(Constant.OpenOrder, true);
				this._oDialog.close();
				await this._clearMOP();
				await this._updateOrderForReTest();
			}
		},

		/**
		   * Function triggered to nav to paymnet app for card transaction.
		   * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		   * @version 1.0.0
		   * @since 06.05.2025
		   * @fires onPressNavtoPaymentapp
		   * @author MM
		   */
		onPressNavtoPaymentapp: function () {
			let oServiceModel = this.getView().getModel("ServicesViewModel");
			MessageToast.show(this.oBundle.getText("home_messageToastNavigatingToPaymentApp"));
			var sUTRN = oServiceModel.getProperty("/UTRN");
			var cardamount = oServiceModel.getProperty("/AaniPayAmount");

			// SAP Start to payemnt screen
			// let currentUrl = 'com.sap.mobile.start://navigation?resolve-type=ibn#Carwash-manage?sap-ui-app-id-hint=saas_approuter_adnoc.btp.cw';

			// SAP Start with payemnt screen Android package
			let currentUrl = 'com.packages.carcare://vehicleinspection-manage?sap-ui-app-id-hint=saas_approuter_adnoc.vi.vehicleinspection';

			// Android package
			// let currentUrl = 'com.packages.carcare://navigation?resolve-type=ibn#Carwash-manage?sap-ui-app-id-hint=saas_approuter_adnoc.btp.cw&/PaymentDetails';

			// Workzone url
			// let currentUrl = 'com.packages.carcare://https://add-dev-bldworkzone.launchpad.cfapps.eu10.hana.ondemand.com/site?siteId=71c29b52-b296-47b6-8299-ca99bc374b04#Carwash-manage?sap-ui-app-id-hint=saas_approuter_adnoc.btp.cw&/PaymentDetails'

			// URL encode it
			let encodedReturnUrl = encodeURIComponent(currentUrl);
			// let encodedReturnUrl = currentUrl;

			// JSON object with data
			var jsonData = {
				TXN_TYPE: PaymentConstant.AaniPayTxnType,
				AMOUNT: parseFloat(cardamount).toFixed(2),  //cardamount, 
				ADNOC_INVOICE: sUTRN, //ADNOC_Invoice,
				binCampaigns: "",
			};

			// Convert JSON object to string
			var jsonString = JSON.stringify(jsonData);

			// Encode the JSON string to be URL-safe
			var encodedJsonString = encodeURIComponent(jsonString);

			// Construct the custom URI with encoded JSON data
			//var uri = "adnoc://pay.com/card?data=" + encodedJsonString;
			// Construct the custom URI with encoded JSON data and returnUrl

			// var uri = "adnoc://sapmetapay.com/card?data=" + encodedJsonString + "&returnUrl=" + encodedReturnUrl;
			var uri = "adnoc://sapmetapay.com/cardpayment?AdnocReqData=" + encodedJsonString + "&returnUrl=" + encodedReturnUrl;
			window.location.href = uri;

		},

		/**
		   * Function triggered to nav to paymnet app for card transaction with Bank.
		   * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		   * @version 1.0.0
		   * @since 06.05.2025
		   * @fires onPressNavtoPaymentapp1
		   * @author MM
		   */


		onPressNavtoPaymentapp1: function () {  // Bank Pay
			let oServiceModel = this.getView().getModel("ServicesViewModel");
			MessageToast.show(this.oBundle.getText("home_messageToastNavigatingToPaymentApp"));
			var sUTRN = oServiceModel.getProperty("/UTRN");
			var cardamount = oServiceModel.getProperty("/CardAmount");


			// SAP Start to payemnt screen
			// let currentUrl = 'com.sap.mobile.start://navigation?resolve-type=ibn#Carwash-manage?sap-ui-app-id-hint=saas_approuter_adnoc.btp.cw';

			// Android Package 
			var currentUrl = "com.packages.carcare://vehicleinspection-manage?sap-ui-app-id-hint=saas_approuter_adnoc.vi.vehicleinspection";

			//var currentUrl = "com.packages.carcare://Carwash-manage?sap-ui-app-id-hint=saas_approuter_adnoc.btp.cw";

			// URL encode it
			let encodedReturnUrl = encodeURIComponent(currentUrl);
			// let encodedReturnUrl = currentUrl;

			// JSON object with data
			var jsonData = {
				TXN_TYPE: PaymentConstant.saleTXNType,
				AMOUNT: parseFloat(cardamount).toFixed(2),   //cardamount
				ADNOC_INVOICE: sUTRN, //ADNOC_Invoice,
				binCampaigns: "",
			};

			// Convert JSON object to string
			var jsonString = JSON.stringify(jsonData);

			// Encode the JSON string to be URL-safe
			var encodedJsonString = encodeURIComponent(jsonString);

			// Construct the custom URI with encoded JSON data
			//var uri = "adnoc://pay.com/card?data=" + encodedJsonString;
			// Construct the custom URI with encoded JSON data and returnUrl

			// var uri = "adnoc://sapmetapay.com/card?data=" + encodedJsonString + "&returnUrl=" + encodedReturnUrl;
			var uri = "adnoc://sapmetapay.com/cardpayment?AdnocReqData=" + encodedJsonString + "&returnUrl=" + encodedReturnUrl;
			window.location.href = uri;

		},

		/**
		 * Function triggered to get Order details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires _onGetSOdetails,_onGetMOPDetails
		 * @author MM
		 */
		_onGetSOdetails: async function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			let iSalesOrderNum = oServiceModel.getProperty("/SO_Number");
			await this.createNewModelUsingAPI(
				Constant.GET,
				`/VehicleOrderInspections?$filter=serviceRequestNo eq ${iSalesOrderNum}&$expand=VehOrdInspDetails($expand=vehOrdInspLines)`,
				'',
				'GetSalesOrderModel'
			);
			const oSalesOrderRes = this.getApiResponseObject();
			let oGetSalesOrderModel = this.getView().getModel("GetSalesOrderModel");

			let oGetSalesOrderData = oGetSalesOrderModel.getData().results;
			let aDetails = oGetSalesOrderData[0].VehOrdInspDetails.results;
			let aAllLines = [];

			aDetails.forEach(detail => {
				if (detail.vehOrdInspLines && detail.vehOrdInspLines.results) {
					detail.vehOrdInspLines.results.forEach(line => {
						// Optionally parent inspId bhi carry karo
						aAllLines.push({
							inspId: detail.inspId,
							...line
						});
					});
				}
			});

			if (oSalesOrderRes.success) {
				var oGlobalModelRes = this.getView().getModel("oGlobalModel");

				//let itemsarr = oGetSalesOrderModel.getData().results[0].VehOrdInspDetails.results[0].vehOrdInspLines;
				oGlobalModelRes.setProperty("/SO_Items", aAllLines);
				oGlobalModelRes.setProperty("/Profile_FleetNumber", aDetails[0].plateNumber);
				oGlobalModelRes.setProperty("/SO_UUID", oGetSalesOrderData[0].vehicleOrderInspectionUUID.toString());
				oGlobalModelRes.setProperty("/UTRN", oGetSalesOrderData[0].orderUTRRefNo.toString());
				oGlobalModelRes.setProperty("/SO_Number", oGetSalesOrderData[0].serviceRequestNo.toString());
				oServiceModel.setProperty("/UTRN", oGetSalesOrderData[0].orderUTRRefNo.toString());
				if (oGetSalesOrderData.length !== PaymentConstant.ArrayZeroLength) {
					var plant = oGlobalModelRes.getProperty("/PlantCode");   //itemsarr[0].PLANT;
					oGlobalModelRes.setProperty("/MainPlant", plant);
				}
				oServiceModel.setProperty("/MyCartTotal", oGetSalesOrderData[0].orderTotal);
				oServiceModel.setProperty("/MyCartTotalDiscount", oGetSalesOrderData[0].discountValue);
				this._onGetMOPDetails();
			} else {
				let oResponse = JSON.parse(oSalesOrderRes.object.responseText);
				MessageBox.error(oResponse.error?.message?.value);
				return;
			}

		},

		/**
			* Function triggered to get the MOP details.
			* @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
			* @version 1.0.0
			* @since 06.05.2025
			* @fires _onGetMOPDetails
			* @author MM
		*/
		_onGetMOPDetails: async function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			let iSalesOrderNum = this.getView().getModel("oGlobalModel").getProperty("/SO_Number");

			await this.createNewModelUsingAPI(
				Constant.GET,
				`/PaymentSet?$filter=orderNumber eq '${iSalesOrderNum}'&$expand=items`,
				'',
				'GetPaymentSetModel'
			);

			const oPaymentSetRes = this.getApiResponseObject();
			let oGetPaymentSetModel = this.getView().getModel("GetPaymentSetModel");
			let oGetPaymentData = oGetPaymentSetModel.getData().results;
			if (oPaymentSetRes.success) {
				if (oGetPaymentData[0].length !== PaymentConstant.ArrayZeroLength) {
					var MopARR = oGetPaymentData[0].items.results;
					this.getView().getModel("oGlobalModel").setProperty("/SO_MOPItems", MopARR);
					oServiceModel.setProperty("/PaymentButtomVisible", false);
					var CardKey = PaymentConstant.bankMopType;
					MopARR.forEach(item => {
						if (item.valueKey === CardKey) {
							oServiceModel.setProperty("/RRN", item.rrn);
						}
					});
				}
			} else {
				let oResponse = JSON.parse(oPaymentSetRes.object.responseText);
				MessageBox.error(oResponse.error?.message?.value);
				return;
			}

		},

		/**
		 * Function triggered to update order status as complted with 'P'.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires _updateOrderstatus
		 * @author MM
		 */
		_updateOrderstatus: async function () {
			let oServiceModel = this.getView().getModel("ServicesViewModel");
			let oMaterialModel = this.getView().getModel("SalesOrderCardDataModel");
			let cartitemsarr = oMaterialModel.getProperty("/MyCartItems");
			let plant = this.getView().getModel("oGlobalModel").getProperty("/MainPlant");
			let SO_Number = oServiceModel.getProperty("/SO_Number");
			let SO_UUID = oServiceModel.getProperty("/SO_UUID");
			let AED = this.oBundle.getText("commom_Currency");
			let itemsarr = [];
			let isAccessories = this.getView().getModel("oGlobalModel").getProperty("/AcceOrderStatusFlag");

			cartitemsarr.forEach(function (item) {
				let obj = {
					"itemNum": String(item.OrderLineNo),
					"material": String(item.Material),
					"materialDesc": item.ServiceName,
					"quantity": item.Quantity,
					"uom": item.UoM,
					"netPrice": parseFloat(item.NetPrice),
					"taxPrice": parseFloat(item.TaxPrice),
					"totalPrice": parseFloat(item.TotalAmount),
					"currency": AED,
					"unitPrice": parseFloat(item.UnitNetPrice),
					"unitTaxPrice": parseFloat(item.UnitTaxPrice),
					"plant": plant,
				};
				itemsarr.push(obj);
			});
			let payload = {
				"orderStatus": isAccessories ? Constant.Order_COMPLETED : PaymentConstant.StatusPayment,  // 'P' -- Payment Done 
				"serviceRequestNo": SO_Number,
				// "items": itemsarr
			};

			await this.saveEntryForm(
				Constant.PATCH,
				"/VehicleOrderInspections(" + SO_UUID + ")",
				payload
			);

			const oResponse = this.getApiResponseObject();
			if (oResponse?.success) {
				let oRes = oResponse
			} else {
				let oRes = JSON.parse(oResponse.object.responseText);
				MessageBox.error(oRes.error?.message?.value);
				return;
			}
		},

		/**
			* Function triggered while changing cash mop amount input.
			* @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
			* @version 1.0.0
			* @since 06.05.2025
			* @fires onLiveChangeCashMop
			* @author MM
		*/
		onLiveChangeCashMop: function (oEvent) {
			let input = oEvent.getSource();
			let value = input.getValue();
			// Remove non-numeric and more than one dot
			value = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
			input.setValue(value);
		},

		/**
			* Function triggered while changing cash mop amount input.
			* @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
			* @version 1.0.0
			* @since 06.05.2025
			* @fires onlivechangeamount
			* @author MM
		*/

		onlivechangeamount: function (oEvent) {
			var value = oEvent.getSource().getValue();
			value = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

			// Condition added to make only 2 decimal value
			var bNotnumber = isNaN(value);
			if (bNotnumber === false) {
				if (value.indexOf(".") !== -1) {
					var Result = (value.indexOf(".") >= 0) ? (value.substr(0, value.indexOf(".")) + value.substr(value.indexOf("."), 3)) : value;
					oEvent.getSource().setValue(Result);
				} else {
					oEvent.getSource().setValue(value);
				}
			} else {
				var RemoveSpecialChar = value.substr(0, value.length - 1);
				oEvent.getSource().setValue(RemoveSpecialChar);
			}

			var oModel = this.getView().getModel("ServicesViewModel").getData();
			var cashamt = oModel.Cashamount;
			var cardamt = oModel.CardAmount;
			var Lamt = oModel.Loyaltyamount;
			var couponamt = oModel.CouponAmount;
			var walletAmount = oModel.WalletAmount;
			var aanipayAmount = oModel.AaniPayAmount;

			if (!walletAmount) {
				walletAmount = PaymentConstant.initialiseZero;
			}
			if (!cashamt) {
				cashamt = PaymentConstant.initialiseZero;
			}
			if (!Lamt) {
				Lamt = PaymentConstant.initialiseZero;
			}
			if (!cardamt) {
				cardamt = PaymentConstant.initialiseZero;
			}
			if (!couponamt) {
				couponamt = PaymentConstant.initialiseZero;
			}
			if (!aanipayAmount) {
				aanipayAmount = PaymentConstant.initialiseZero;
			}
			var moptotal = parseFloat(cashamt) + parseFloat(cardamt) + parseFloat(couponamt) + parseFloat(Lamt) + parseFloat(walletAmount) + parseFloat(aanipayAmount);
			var soamt = oModel.MyCartTotal;

			// Check for partialPayment
			var sPartialPaymentFlag = this.getView().getModel("ServicesViewModel").getProperty("/PartialPaymentFlag");
			if (sPartialPaymentFlag) {
				soamt = this.getView().getModel("ServicesViewModel").getProperty("/BalancetoPay");
			}

			if (parseFloat(moptotal) > parseFloat(soamt)) {
				// MessageToast.show(this.oBundle.getText("msgMOPAMountError"));
				MessageToast.show(this.oBundle.getText("msgMOPAMountError"), {
					duration: 1500, // Time in milliseconds
					at: "center center", // Position the toast at the center
					my: "center center"  // Align it to the center
				});
				oEvent.getSource().setValue("");
			} else {
				// do nothing
			}
		},

		/**
		 * Function triggered while changing cash mop amount input.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onChangeCashMop
		 * @author MM
		 */
		onChangeCashMop: function (oEvent) {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = parseFloat(oValue).toFixed(2);
			var cardamount = oServiceModel.getProperty("/CardAmount");
			var loyaltyamount = oServiceModel.getProperty("/Loyaltyamount");
			var couponamount = oServiceModel.getProperty("/CouponAmount");
			var soamount = oServiceModel.getProperty("/MyCartTotal");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
			if (Total > soamount) {
				MessageToast.show(this.oBundle.getText("home_messageToastGreaterThanOrderAmount"));
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				oServiceModel.setProperty("/CashAmount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered while changing card mop amount input.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onLiveChangeCardMop
		 * @author MM
		 */
		onLiveChangeCardMop: function (oEvent) {
			let input = oEvent.getSource();
			let value = input.getValue();
			// Remove non-numeric and more than one dot
			value = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

			input.setValue(value);
		},


		/**
		 * Function triggered while changing card mop amount input.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onChangeCardMop
		 * @author MM
		 */
		onChangeCardMop: function (oEvent) {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = oServiceModel.getProperty("/Cashamount");
			var cardamount = parseFloat(oValue).toFixed(2);
			var loyaltyamount = oServiceModel.getProperty("/Loyaltyamount");
			var couponamount = oServiceModel.getProperty("/CouponAmount");
			var soamount = oServiceModel.getProperty("/MyCartTotal");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
			if (Total > soamount) {
				MessageToast.show(this.oBundle.getText("home_messageToastGreaterThanOrderAmount"));
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				oServiceModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered while changing AaniPay mop amount input.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onChangeAanipayMop
		 * @author MM
		 */

		onChangeAanipayMop: function (oEvent) {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = oServiceModel.getProperty("/Cashamount");
			var aanipayamount = parseFloat(oValue).toFixed(2);
			var loyaltyamount = oServiceModel.getProperty("/Loyaltyamount");
			var couponamount = oServiceModel.getProperty("/CouponAmount");
			var walletamount = oServiceModel.getProperty("/WalletAmount");
			var cardamount = oServiceModel.getProperty("/CardAmount");
			var soamount = oServiceModel.getProperty("/MyCartTotal");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletamount);
			if (Total > soamount) {
				MessageToast.show(this.oBundle.getText("home_messageToastGreaterThanOrderAmount"));
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				oServiceModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered while changing loyalty mop amount input.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onLiveChangeLoyaltyMop
		 * @author MM
		 */

		onLiveChangeLoyaltyMop: function (oEvent) {
			let input = oEvent.getSource();
			let value = input.getValue();
			// Remove non-numeric and more than one dot
			value = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
			input.setValue(value);
		},


		/**
		 * Function triggered while changing loyalty mop amount input.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onChangeLoyaltyMop
		 * @author MM
		 */
		onChangeLoyaltyMop: function (oEvent) {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = oServiceModel.getProperty("/Cashamount");
			var cardamount = oServiceModel.getProperty("/CardAmount");
			var loyaltyamount = parseFloat(oValue).toFixed(2);
			var couponamount = oServiceModel.getProperty("/CouponAmount");
			var soamount = oServiceModel.getProperty("/MyCartTotal");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
			if (Total > soamount) {
				MessageToast.show(this.oBundle.getText("home_messageToastGreaterThanOrderAmount"));
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				oServiceModel.setProperty("/Loyaltyamount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered while changing coupon mop amount input.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onLiveChangeCouponMop
		 * @author MM
		 */
		onLiveChangeCouponMop: function (oEvent) {
			let input = oEvent.getSource();
			let value = input.getValue();
			// Remove non-numeric and more than one dot
			value = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
			input.setValue(value);
		},


		/**
		 * Function triggered while changing coupon mop amount input.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onChangeCouponMop
		 * @author MM
		 */
		onChangeCouponMop: function (oEvent) {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = oServiceModel.getProperty("/Cashamount");
			var cardamount = oServiceModel.getProperty("/CardAmount");
			var loyaltyamount = oServiceModel.getProperty("/Loyaltyamount");
			var couponamount = parseFloat(oValue).toFixed(2);
			var soamount = oServiceModel.getProperty("/MyCartTotal");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
			if (Total > soamount) {
				MessageToast.show(this.oBundle.getText("home_messageToastGreaterThanOrderAmount"));
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				oServiceModel.setProperty("/CouponAmount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered to read loyalty code.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onReadKey
		 * @author MM
		 */
		onReadKey: async function () {
			await this.createNewModelUsingAPI(
				Constant.GET,
				'/getKey',
				'',
				'GetKeyModel'
			);
			const oGetKeyRes = this.getApiResponseObject();

			if (oGetKeyRes.success) {
				let oGlobalModelRes = this.getView().getModel("oGlobalModel");
				let oServiceModel = this.getView().getModel("ServicesViewModel");
				let oGetKey = this.getView().getModel("GetKeyModel");
				let oGetKeyData = oGetKey.getData().results[0];
				oServiceModel.setProperty("/DecryptKey", oGetKeyData.key.value);
				oServiceModel.setProperty("/DecryptIV", oGetKeyData.iv.value);
				oGlobalModelRes.setProperty("/DecryptKey", oGetKeyData.key.value);
				oGlobalModelRes.setProperty("/DecryptIV", oGetKeyData.iv.value);
			} else {
				let oResponse = JSON.parse(oGetKeyRes.object.responseText);
				MessageBox.error(oResponse.error?.message?.value);
				return;
			}

		},

		/**
		 * Function triggered while doing Scan Coupon.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires onScanCouponSuccess
		 * @author MM
		 */

		onScanCouponSuccess: async function (oEvent) {

			if (oEvent.getParameter("cancelled")) {
				MessageToast.show(this.oBundle.getText("commom_ScanFailed"));
			} else {
				if (oEvent.getParameter("text")) {
					await this.onReadKey();
					var scannedvalue = oEvent.getParameter("text");
					scannedvalue = scannedvalue.split("AA1:")[1];
					await this._onDecryptLoyaltyId(scannedvalue, PaymentConstant.coupon);
					this.getView().getModel("oGlobalModel").setProperty("/Coupon_ScanedIDInp", "");
				} else {
					oScanResultText.setText('');
				}
			}
		},

		/**
		 * Function triggered while doing Scan Coupon.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires onScanCouponError
		 * @author MM
		 */

		onScanCouponError: function () {
			MessageToast.show(this.oBundle.getText("commom_ScanFailed"));
		},

		/**
		 * Function triggered to fetch loyalty.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires fetchloyaltyDetails
		 * @author MM
		 */
		fetchloyaltyDetails: async function (loyaltyid) {
			var oGlobalModelRes = this.getView().getModel("oGlobalModel");
			await this.createNewModelUsingAPI(
				Constant.GET,
				`/fetchLoyaltyDetails?input='${loyaltyid}'`,
				'',
				'GetLoyaltyDetailModel'
			);
			const oGetLoyalityDetailRes = this.getApiResponseObject();

			if (oGetLoyalityDetailRes.success) {
				let oGetLoyaltyModel = this.getView().getModel("GetLoyaltyDetailModel");
				let oGetLoyaltyData = oGetLoyaltyModel.getData().results[0]

				MessageToast.show(this.oBundle.getText("home_messageToastPleaseRemoveCard"), {
					duration: 1500, // Time in milliseconds
					at: "center center", // Position the toast at the center
					my: "center center"  // Align it to the center
				});

				// CLose if any fragment is open
				if (this.RewardCheckFrag) {
					if (this.RewardCheckFrag.isOpen()) {
						this.RewardCheckFrag.close();
					}
				}
				if (this.CouponServiesScreen) {
					if (this.CouponServiesScreen.isOpen()) {
						this.CouponServiesScreen.close();
					}
				}
				let balance = oGetLoyaltyData.responseData.balance;
				let tierName = oGetLoyaltyData.responseData.tierName;
				oGlobalModelRes.setProperty("/LoyaltyID", loyaltyid);
				oGlobalModelRes.setProperty("/LoyaltyBal", balance);
				oGlobalModelRes.setProperty("/LoyaltyTierName", tierName);
				oGlobalModelRes.setProperty("/Loyalty_ScanedIDInp", "");
				oGlobalModelRes.setProperty("/Loyalty_ScanedIDManualInp", "");
				var LoyaltyIDMasked = loyaltyid.replace(loyaltyid.substring(3, loyaltyid.length - 2), "******");
				oGlobalModelRes.setProperty("/LoyaltyIDMasked", LoyaltyIDMasked);

				var emiratesToken = oGlobalModelRes.getProperty("/EmiratesTokenSerial");
				if (loyaltyid.match("EID") !== null && emiratesToken) {
					this._getPayment24CustDetails(emiratesToken);
				}
			} else {
				let oResponse = JSON.parse(oGetLoyalityDetailRes.object.responseText);
				MessageBox.error(oResponse.error?.message?.value);
				oGlobalModelRes.setProperty("/LoyaltyID", "");
				return;
			}
		},

		/**
		 * Function triggered to check loyalty.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onCheckloyalty
		 * @author MM
		 */
		onCheckloyalty: function () {
			var loyaltyid = this.getView().getModel("oGlobalModel").getData().Loyalty_ScanedIDManualInp;
			if (loyaltyid) {
				this.fetchloyaltyDetails(loyaltyid);
			} else {
				MessageToast.show(this.oBundle.getText("home_messageToastLoyaltyNumberManually"));
			}
		},

		/**
		 * Function triggered livechange ndc scann input.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onscannedvalueLivechange
		 * @author MM
		 */
		onscannedvalueLivechange: function (oEvent) {
			var value = oEvent.getSource().getValue();
			// Allow only letters, numbers, and colon (:) added on 18-07-2025
			var value = value.replace(/[^a-zA-Z0-9:]/g, '');
			oEvent.getSource().setValue(value)
			value = value.split("AA1:")[1];
			this._onDecryptLoyaltyId(value);
		},

		/**
		 * Function triggered livechange ndc scann input.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires onscannedvalueLivechange1
		 * @author MM
		 */

		onscannedvalueLivechange1: function (oEvent) {
			var value = oEvent.getSource().getValue();
			// Allow only letters, numbers, and colon (:) added on 18-07-2025
			var value = value.replace(/[^a-zA-Z0-9:]/g, '');
			oEvent.getSource().setValue(value)
			value = value.split("AA1:")[1];
			this._onDecryptLoyaltyId(value);
		},

		/**
		 * Event to decrypt the loyalty value with key .
		 * @memberof adnoc.btp.cw.controller.Home.
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MM
		 * @fires _onDecryptLoyaltyId
		 */
		_onDecryptLoyaltyId: function (input, QRkey) {
			var oGlobalModelRes = this.getView().getModel("oGlobalModel");
			let oServiceModel = this.getView().getModel("ServicesViewModel");
			var keyvalue = oServiceModel.getProperty("/DecryptKey");
			var ivvalue = oServiceModel.getProperty("/DecryptIV");

			var keystring = keyvalue.match(/.{1,2}/g).reduce((acc, char) => acc + String.fromCharCode(parseInt(char, 16)), "");
			var ivstring = ivvalue.match(/.{1,2}/g).reduce((acc, char) => acc + String.fromCharCode(parseInt(char, 16)), "");
			var key = CryptoJS.enc.Utf8.parse(keystring); // keyvalue
			var iv = CryptoJS.enc.Utf8.parse(ivstring); //iv value

			// input value hold the scanned value from the qr scanner
			var decrypted = CryptoJS.AES.decrypt({ ciphertext: CryptoJS.enc.Hex.parse(input) }, key, {
				keySize: 128 / 8,
				iv: iv,
				mode: CryptoJS.mode.CBC,
				padding: CryptoJS.pad.NoPadding
			});
			// converting decryted value to string
			var str = decrypted.toString(CryptoJS.enc.Utf8); // str holds the decrypted value 
			str = str.split('\x00', 1)[0];
			var jsonparse = JSON.parse(str);

			if (jsonparse.function === PaymentConstant.LoyaltyIDFunction) {
				var loyaltyid = jsonparse.LOY;
				this.fetchloyaltyDetails(loyaltyid);
			} else if (jsonparse.function === PaymentConstant.RewardFunction) {
				var loyaltyid = jsonparse.LOY;
				this.fetchloyaltyDetails(loyaltyid);
				oGlobalModelRes.setProperty("/LoyaltyID", loyaltyid);
				oGlobalModelRes.refresh();
				var couponno = jsonparse.AR;
				oGlobalModelRes.setProperty("/Coupon_ScanedIDManualInp", couponno);
				if (couponno) {
					this.intervalHandle = setTimeout(function () {
						this.onCheckLoyaltyDiscount();
					}.bind(this), 300);
				}
			}
		},

		/**
		 * Event triggered to read Emirates Card Details.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onReadAdnocPlusCard
		 */
		onReadAdnocPlusCard: function () {
			$.ajax({
				url: PaymentConstant.AdnocCardURL,
				method: Constant.GET,
				dataType: 'json',
				success: function (data) {
					var base64string = data.cardData;
					var decodedstring = atob(base64string);
					this.getView().getModel("ServicesViewModel").setProperty("/WalletNumber", decodedstring);
					this._getPayment24CustDetails(decodedstring);
				}.bind(this), error: function (jqXHR, textStatus, errorThrown) {
					MessageToast.show(this.oBundle.getText("home_messageToastErrorfetchingcarddata"));

				}.bind(this)
			});
		},

		/**
		 * Event triggered to read Emirates Card Loyalty.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onpressReadEmiratesCardLoyalty
		 */

		onpressReadEmiratesCardLoyalty: function () {
			var source = PaymentConstant.loyalty;
			this.onReadEmiratesCard(source);
		},

		/**
		 * Event triggered to read Emirates CardP24.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onpressReadEmiratesCardP24Fragment
		 */

		onpressReadEmiratesCardP24Fragment: function () {
			var source = PaymentConstant.wallet;
			this.onReadEmiratesCard(source);
		},

		/**
		 * Event triggered to read Emirates CardP24.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onpressReadANPR
		 */

		onpressReadANPR: function () {

			let oGlobalModel = this.getView().getModel("oGlobalModel");
			let sPlateNo = oGlobalModel.getProperty("/PlateNo");
			let sPlateColor = oGlobalModel.getProperty("/PlateColor");
			let sPlateSource = oGlobalModel.getProperty("/PlateSourceCode");
			let sPlateKind = oGlobalModel.getProperty("/PlateKind");

			let oANPRPayload = {
				plate: sPlateNo,
				source: sPlateSource,
				color: sPlateColor,
				kind: sPlateKind
			}
			oGlobalModel.setProperty("/walletByANPR", true);
			this._getPayment24CustDetails(oANPRPayload);
		},

		/**
		 * Event triggered to check is ANPR Applicable or Not
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires isListEmpty
		 */

		isANPNRApplicable: function (aResults, bIsServicePage) {
			if (!aResults) {
				return false;
			}
			// 2. LOGIC: Check length AND the service page flag
			// This returns a boolean directly, no if/else needed
			return (aResults.length === Constant.oneRecordCheck && bIsServicePage);
		},

		/**
		 * Event triggered to read Emirates Card Details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onReadEmiratesCard
		 */
		onReadEmiratesCard: function (source) {
			MessageToast.show(this.oBundle.getText("home_messageToastPleaseInsertCard"));
			$.ajax({
				url: PaymentConstant.EidCardURL,
				method: Constant.GET,
				dataType: 'json',
				success: function (data) {
					var base64string = data.cardData;
					var decodedstring = atob(base64string);
					var parsedstring = JSON.parse(decodedstring);
					var EID = parsedstring.emiratesId;
					var emiratesToken = parsedstring.tokenSerial;
					this.getView().getModel("oGlobalModel").setProperty("/EmiratesTokenSerial", emiratesToken);
					this.getView().getModel("oGlobalModel").setProperty("/EmiratesID", EID);
					MessageToast.show(this.oBundle.getText("home_messageToastPleaseRemoveCard"));
					// To fetch loyalty details by passing emirates id 
					if (source === PaymentConstant.loyalty) {  // Pass EID for loyalty details
						this.fetchloyaltyDetails(EID);
					} else if (source === PaymentConstant.wallet) { // Pass tokenno for (wallet, Adnoc plus,p24)
						this._getPayment24CustDetails(emiratesToken);
					}


				}.bind(this),
				error: function (jqXHR, textStatus, errorThrown) {
					let oMsg = this.oBundle.getText("home_messageToastErrorfetchingcarddata")
					MessageToast.show(oMsg);
				}
			});

		},

		/**
		 * Event triggered to while doing loyalty discount for the material.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onCheckLoyaltyDiscount
		 */

		onCheckLoyaltyDiscount: async function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			var oServiceOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
			let aServiceItems = oServiceOrderCardModel.getProperty("/MyCartItems");

			var oGlobalModel = this.getView().getModel("oGlobalModel");
			var oGlobalData = oGlobalModel.getData();

			oGlobalModel.setProperty("/UTRN", oGlobalData.OrderResponse.orderUTRRefNo);
			oServiceModel.setProperty("/MyCartItems", aServiceItems);

			var Partner = PaymentConstant.LineofBusiness;
			var AED = PaymentConstant.Currency;
			var Category = PaymentConstant.LoyaltyMatCategory;
			var location = oGlobalData.MainPlantSiteNo;
			var PaymentMethod = PaymentConstant.LoyaltyPaymethod;
			var Comment = PaymentConstant.LoyaltyComment;

			var loyaltyId = oGlobalData.LoyaltyID;
			if (loyaltyId) {

				var Itemsarr = [];
				var item = 10;
				for (var i = 0; i < aServiceItems.length; i++) {
					var itemstring = item.toString();
					var obj = {
						"lineNo": parseInt(itemstring),
						"code": aServiceItems[i].Material,
						"category": Category,
						"name": aServiceItems[i].ServiceName,
						"quantity": parseFloat(aServiceItems[i].Qty),
						"amount": parseFloat(aServiceItems[i].TotalAmount),
						"discounted": false
					};
					item = item + 10;
					Itemsarr.push(obj);
				}
				var trxno = oGlobalData.SO_OrderID;
				trxno = parseInt(trxno) + 1;

				var couponno = oGlobalData.Coupon_ScanedIDManualInp;
				var arrCoupon = [];
				if (couponno) {
					arrCoupon = [couponno];
				}

				var currdate = new Date();
				currdate = Formatter.getDateFromatIn_yyyyMMdd(currdate);

				var sInput = {
					"comment": Comment,
					"partner": PaymentConstant.CLMPartner,
					"location": location,
					"date": currdate,
					"currencyCode": AED,
					"paymentMethod": PaymentMethod,
					"trnNo": "",  //trxno.toString(),
					"coupons": arrCoupon,
					"burnPoints": null,
					"products": Itemsarr,
					"lineOfBusiness": Partner,
					"businessDate": oGlobalData.EmployeeData.BusinessDate,
				}

				let oPayload = {
					Payload: sInput,
					loyaltyID: loyaltyId,
					simulation: true
				}

				//sInput = JSON.stringify(sInput);
				await this.createNewModelUsingAPI(
					Constant.POST,
					'/fetchInputDetails',
					oPayload,
					'LoyalityCouponModel'
				);

				let oResponse = this.getApiResponseObject();
				if (oResponse.success) {
					let oLoyalityCouponModel = this.getView().getModel("LoyalityCouponModel");
					let response = oLoyalityCouponModel.getData().results[0].responseData
					var discountedproducts = response.products;

					if (discountedproducts.length !== PaymentConstant.ArrayZeroLength) {
						// // Check any discount amount in cart items
						var DisAmount = aServiceItems.map(o => o.DiscountAmount).reduce((a, c) => {
							return parseFloat(a) + parseFloat(c)
						});

						oServiceModel.setProperty("/couponArray", arrCoupon); // Send to BG
						oGlobalModel.setProperty("/Coupon_ScanedIDManualInp", "");
						oGlobalModel.setProperty("/Coupon_Number", couponno);
						oGlobalModel.setProperty("/Coupon_SavedAmt", DisAmount);
					} else {
						MessageToast.show(this.oBundle.getText("msgNoCLMProducts"));
					}

				}
				else {
					let oRes = JSON.parse(oResponse.object.responseText);
					MessageBox.error(oRes.error?.message?.value);
					oGlobalModel.setProperty("/LoyaltyID", "");
					return;
				}

			} else {
				MessageToast.show(this.oBundle.getText("msgLoyaltyScanError"));
				this.onPressCheckCard();
			}
		},

		/**
		 * Event triggered to while doing Apply discount for the materials
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onBtnPressApplyDiscount
		 */

		onBtnPressApplyDiscount: function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			let oServiceOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
			var aServiceItems = oServiceOrderCardModel.getProperty("/MyCartItems");

			var oGlobalModel = this.getView().getModel("oGlobalModel");
			var oGlobalData = oGlobalModel.getData();
			oServiceModel.setProperty("/MyCartItems", aServiceItems);
			var oServiceData = oServiceModel.getData();
			oGlobalModel.setProperty("/UTRN", oGlobalData.OrderResponse.orderUTRRefNo);

			//  Store Previous MyCartItems in a separate Global Model
			let aPrevCartItems = JSON.parse(JSON.stringify(aServiceItems)); // deep clone
			oGlobalModel.setProperty("/MyPrevCartItems", aPrevCartItems);

			if (oGlobalData.Coupon_Number === "") {
				MessageToast.show(this.oBundle.getText("paymentIntegration_NoApplied"));
				return;
			}

			let oLoyalityCouponModel = this.getView().getModel("LoyalityCouponModel");
			let response = oLoyalityCouponModel.getData().results[0].responseData
			var discountedproducts = response.products;

			if (discountedproducts.length !== PaymentConstant.ArrayZeroLength) {
				var productlength = aServiceItems.length;
				var count = PaymentConstant.ArrayZeroLength;
				for (var i = 0; i < discountedproducts.length; i++) {
					if (parseFloat(discountedproducts[i].moneyDiscount) === PaymentConstant.ArrayZeroLength) {
						count = count + 1;
					}
				}
				var loyaltymsg = "";
				if (productlength === count) {
					loyaltymsg = this.oBundle.getText("msgCLMNoDiscounts");
				} else {
					loyaltymsg = this.oBundle.getText("msgCLMPromt1") + "\n" + this.oBundle.getText("msgCLMPromt2");
				}
				var appliedcoupons = [];
				for (var i = 0; i < discountedproducts.length; i++) {
					for (var j = 0; j < aServiceItems.length; j++) {
						if (aServiceItems[j].Material.toString() === discountedproducts[i].code) {

							if (aServiceItems[j].DiscountAmount >= parseFloat(discountedproducts[i].moneyDiscount).toFixed(2)) {
								aServiceItems[j].DiscountAmount = aServiceItems[j].DiscountAmount;
								MessageToast.show(this.oBundle.getText("msgCLMCouponAppliedOrNot"));
								return
							} else {
								aServiceItems[j].DiscountAmount = parseFloat(discountedproducts[i].moneyDiscount).toFixed(2);
							}


							aServiceItems[j].VAT = ((
								(aServiceItems[j].TotalAmount -
									aServiceItems[j].DiscountAmount).toFixed(2)
							) / 1.05 * 0.05).toFixed(2);

							let baseAmount = aServiceItems[j].TotalAmount -
								aServiceItems[j].DiscountAmount;

							aServiceItems[j].TotalWithOutVAT = (baseAmount - Number(aServiceItems[j].VAT));
							if (parseFloat(discountedproducts[i].moneyDiscount) > PaymentConstant.ArrayZeroLength) {
								aServiceItems[j].vehicleOrderCoupans = [{
									couponNumber: oGlobalData.Coupon_Number,
									condType: null,
									condValue: -parseFloat(aServiceItems[j].DiscountAmount),
									condCurrency: PaymentConstant.Currency
								}];
							}
						}
					}
				}

				var usedCoupons;
				if (response.usedCoupons) {
					usedCoupons = response.usedCoupons;
				} else {
					usedCoupons = [];
				}

				if (usedCoupons.length !== 0) {
					usedCoupons = usedCoupons.filter(key => key.useResult === PaymentConstant.CouponUsed);
				}
				for (var i = 0; i < usedCoupons.length; i++) {
					if (aServiceItems[i] !== undefined) {
						aServiceItems[i].vehicleOrderCoupans[i].couponNumber = usedCoupons[i].couponNumber;
					}
				}
				// if (loyaltymsg === this.oBundle.getText("msgCLMNoDiscounts")) {
				// 	arrCoupon.splice(-1) // removing the last coupon if no discounts found
				// }
				var ServiceItemsarr = oServiceData.MyCartItems;

				var Total = ServiceItemsarr.map(o => o.TotalAmount).reduce((a, c) => {
					return parseFloat(a) + parseFloat(c)
				});

				// Check any discount amount in cart items
				var DisAmount = ServiceItemsarr.map(o => o.DiscountAmount).reduce((a, c) => {
					return parseFloat(a) + parseFloat(c)
				});

				var VatAmount = ServiceItemsarr.map(o => o.VAT).reduce((a, c) => {
					return parseFloat(a) + parseFloat(c)
				});
				var GrandTotal = Total - DisAmount;

				oServiceModel.getData().MyCartTotal = parseFloat(Total).toFixed(2);
				oServiceModel.getData().MyCartTotalDiscount = parseFloat(DisAmount).toFixed(2);
				oServiceOrderCardModel.setProperty("/DiscountAmount", parseFloat(DisAmount).toFixed(2));
				oServiceOrderCardModel.setProperty("/VatAmount", parseFloat(VatAmount).toFixed(2));
				oServiceOrderCardModel.setProperty("/SubTotal", parseFloat(Total).toFixed(2));
				oServiceOrderCardModel.setProperty("/SubTotalAfterDis", parseFloat(GrandTotal).toFixed(2));
				oServiceOrderCardModel.setProperty("/OrderTotal", parseFloat(GrandTotal).toFixed(2));
				//oServiceModel.setProperty("/couponArray", arrCoupon);

				oServiceModel.refresh();
				oServiceOrderCardModel.refresh();
				oServiceModel.setProperty("/PaymentButtomVisible", false);
				oGlobalModel.setProperty("/Coupon_Msg", "Coupon Applied");
				oGlobalModel.setProperty("/Coupon_Number", oGlobalData.Coupon_Number);
				oGlobalModel.setProperty("/Coupon_SavedAmt", DisAmount);
				oGlobalModel.setProperty("/isCouponApplied", true);
				this.getView().getModel("ButtonVisibleModel").setProperty("/UpdatebtnVisible", true);
				MessageToast.show(loyaltymsg);
			} else {
				MessageToast.show(this.oBundle.getText("msgNoCLMProducts"));
			}

		},

		/**
		 * Function triggered to Delete Coupons.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 02.04.2025
		 * @fires  onpressDeleteCoupon
		 * @author MM
		 */

		onBtnPressRemoveCoupon: function () {
			let oGlobalModel = this.getView().getModel("oGlobalModel");
			let oServiceModel = this.getView().getModel("SalesOrderCardDataModel");
			let isCouponApplied = oGlobalModel.getProperty("/isCouponApplied");

			if (isCouponApplied) {
				MessageBox.confirm(
					this.oBundle.getText("mainMenu_messageBoxWantToDelete"), {
					icon: MessageBox.Icon.CONFIRM,
					title: this.oBundle.getText("mainMenu_messageBoxWantToDelete"),
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: function (oAction) {
						if (oAction === MessageBox.Action.YES) {

							let aCartItems = oServiceModel.getProperty("/MyCartItems") || [];
							let aPrevCartItems = oGlobalModel.getProperty("/MyPrevCartItems") || [];
							var DisAmount = aPrevCartItems.map(o => o.DiscountAmount).reduce((a, c) => {
								return parseFloat(a) + parseFloat(c)
							});

							var VatAmount = aPrevCartItems.map(o => o.VAT).reduce((a, c) => {
								return parseFloat(a) + parseFloat(c)
							});

							// Reset totals
							let Total = aPrevCartItems.map(o => o.TotalAmount).reduce((a, c) => parseFloat(a) + parseFloat(c), 0);

							var GrandTotal = Total - DisAmount;

							oServiceModel.setProperty("/MyCartTotal", parseFloat(Total).toFixed(2));
							oServiceModel.setProperty("/MyCartTotalDiscount", "0.00");
							oServiceModel.setProperty("/MyCartItems", aPrevCartItems);

							oServiceModel.setProperty("/DiscountAmount", parseFloat(DisAmount).toFixed(2));
							oServiceModel.setProperty("/VatAmount", parseFloat(VatAmount).toFixed(2));
							oServiceModel.setProperty("/SubTotal", parseFloat(Total).toFixed(2));

							oServiceModel.setProperty("/OrderTotal", GrandTotal.toFixed(2));
							oServiceModel.setProperty("/SubTotalAfterDis", GrandTotal.toFixed(2));

							oServiceModel.setProperty("/couponArray", []);

							oGlobalModel.setProperty("/Coupon_Msg", null);
							oGlobalModel.setProperty("/Coupon_Number", "");
							oGlobalModel.setProperty("/Coupon_SavedAmt", 0);
							oGlobalModel.setProperty("/isCouponApplied", false); // reset flag
							this.getView().getModel("ButtonVisibleModel").setProperty("/UpdatebtnVisible", false);
							oServiceModel.refresh();
							MessageToast.show(this.oBundle.getText("paymentIntegration_couponRemove"));
						}
					}.bind(this)
				});
			} else {
				MessageToast.show(this.oBundle.getText("payment_NoCouponRemove"));
			}
		},


		/**
		 * Event triggered to while doing payment with loyalty to earn and redeem.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onPressRedeemLoyalty
		 */

		onPressRedeemLoyalty: async function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			let oServiceOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
			let aServiceItems = oServiceOrderCardModel.getProperty("/MyCartItems");
			oServiceModel.setProperty("/MyCartItems", aServiceItems);

			let oModel = oServiceModel.getData();
			let oGlobalModel = this.getView().getModel("oGlobalModel");
			let oGlobalData = oGlobalModel.getData();
			oGlobalModel.setProperty("/UTRN", oGlobalData.OrderResponse.orderUTRRefNo);
			let loyaltyId = oGlobalData.LoyaltyID;
			let Partner = PaymentConstant.LineofBusiness;
			let AED = PaymentConstant.Currency;
			let Category = PaymentConstant.LoyaltyMatCategory;
			let location = oGlobalData.MainPlantSiteNo
			let Comment = PaymentConstant.LoyaltyComment;
			let Itemsarr = [];
			oModel.MyCartItems.forEach(function (item) {
				var obj = {
					"lineNo": parseInt(item.OrderLineNo),
					"code": item.Material,
					"category": Category,
					"name": item.ServiceName,
					"quantity": parseInt(item.Qty),
					"amount": parseFloat(item.SubTotalAfterDis),  // ActualPrice
					"discounted": false
				};
				Itemsarr.push(obj);
			});

			var trxno = oGlobalData.UTRN;
			var couponno = oGlobalData.Coupon_ScanedIDManualInp
			var arrCoupon = [];
			if (couponno) {
				arrCoupon.push(couponno);
			}
			var redeemablepoints = null;
			var loyaltyamount = oModel.Loyaltyamount;  // get loaylty amount
			if (parseFloat(loyaltyamount) > PaymentConstant.ArrayZeroLength) {
				redeemablepoints = parseFloat(loyaltyamount) * 1000;
			} else {
				redeemablepoints = null;
			}
			let currdate = new Date();
			let businessDate = Formatter.getDateFromatIn_yyyyMMdd(currdate);

			// Passing the MOP info to the payload
			var cashamount = oModel.Cashamount;
			var cardamount = oModel.CardAmount;
			var AanipayAmount = oModel.AaniPayAmount;
			var Loyaltyamount = oModel.Loyaltyamount;
			var walletAmount = oModel.WalletAmount;
			var paymentmethods = [];

			if (parseFloat(cardamount) > PaymentConstant.ArrayZeroLength) {
				paymentmethods.push({
					"code": PaymentConstant.cardLoyaltyMOP,
					"amount": parseFloat(cardamount)
				});
			}
			if (parseFloat(walletAmount) > PaymentConstant.ArrayZeroLength) {
				paymentmethods.push({
					"code": PaymentConstant.smartpayLoyaltyMOP,
					"amount": parseFloat(walletAmount)
				});
			}
			if (parseFloat(Loyaltyamount) > PaymentConstant.ArrayZeroLength) {
				paymentmethods.push({
					"code": PaymentConstant.smartpayLoyaltyMOP,
					"amount": parseFloat(Loyaltyamount)
				});
			}
			if (parseFloat(cashamount) > PaymentConstant.ArrayZeroLength) {
				paymentmethods.push({
					"code": PaymentConstant.cashLoyaltyMOP,
					"amount": parseFloat(cashamount)
				});
			}
			if (parseFloat(AanipayAmount) > PaymentConstant.ArrayZeroLength) {
				paymentmethods.push({
					"code": PaymentConstant.cardLoyaltyMOP,
					"amount": parseFloat(AanipayAmount)
				});
			}

			let sInput = {
				"comment": Comment,
				"partner": Partner,
				"date": businessDate,
				"currencyCode": AED,
				"paymentMethods": paymentmethods,
				"trnNo": trxno.toString(),
				"coupons": arrCoupon,
				"burnPoints": redeemablepoints,
				"products": Itemsarr,
				"location": location,
				"lineOfBusiness": Partner,
				"businessDate": oGlobalData.EmployeeData.BusinessDate,
			}
			let oPayload = {
				Payload: sInput,
				loyaltyID: loyaltyId,
				simulation: false
			}

			await this.createNewModelUsingAPI(
				Constant.POST,
				'/fetchInputDetails',
				oPayload,
				'LoyalitySalesModel'
			);

			let oResponse = this.getApiResponseObject();
			if (oResponse.success) {
				let oLoyalitySalesModel = this.getView().getModel("LoyalitySalesModel");
				let response = oLoyalitySalesModel.getData().results[0].responseData;
				//if (response.burnPoints > PaymentConstant.ArrayZeroLength || response.bonusPoints > PaymentConstant.ArrayZeroLength) {
				oModel.CLMMessage = response.message;
				oModel.LoyaltyAuthcode = trxno.toString();
				//MessageToast.show(response.message);
				oServiceModel.refresh;
				if (parseFloat(oModel.WalletAmount) > 0) {
					this.postPayment24();
				} else {
					this.onSavePayment();
				}
			}
			else {

				// If loyalty redeem failed enable payment again // added on 12-07-2025
				oGlobalModel.setProperty("/LoyaltyID", "");
				oServiceModel.setProperty("/PaymentButtomVisible", true);
				let oRes = JSON.parse(oResponse.object.responseText);
				MessageBox.error(oRes.error?.message?.value);
				return;
			}

		},


		/**
		 * Function triggered when Need to do Payment.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.05.2025
		 * @fires - onPresspayment, 
		 * @author MM
		 */

		onPresspayment: function () {
			var bIsSaveVisible = this.byId("save").getVisible();
			let oCustomerInfoModel = this.getView().getModel("SalesOrderCardDataModel").getProperty("/CustomerInfo");
			let oUpdateStatusModel = this.getView().getModel("ButtonVisibleModel");
			let oGlobalModelRes = this.getView().getModel("oGlobalModel");
			let isService = oGlobalModelRes.getProperty("/isServicePage");

			if (isService) {
				if (oCustomerInfoModel && Object.keys(oCustomerInfoModel).length == Constant.ArrayZeroLength || (!oCustomerInfoModel.commTypeMail && !oCustomerInfoModel.commTypeSMS)) {
					MessageBox.warning(this.oBundle.getText("payment_messageBoxRequiredRepres"));
					return
				}
			}

			if (oUpdateStatusModel.getData().UpdatebtnVisible) {
				MessageBox.warning(this.oBundle.getText("payment_messageBoxPleaseupdateSalesOrderFirst"));
				return
			}

			if (bIsSaveVisible) {
				MessageBox.warning(this.oBundle.getText("payment_messageBoxPleaseSaveRepresentative"));
				return
			}
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			let oModel = this.getView().getModel("ServicesViewModel").getData();
			let oGlobalModel = this.getView().getModel("oGlobalModel");
			let oGlobalData = oGlobalModel.getData();
			let cashamount = oServiceModel.getProperty("/Cashamount");
			let cardamount = oServiceModel.getProperty("/CardAmount");
			let Loyaltyamount = oServiceModel.getProperty("/Loyaltyamount");
			let couponamount = oServiceModel.getProperty("/CouponAmount");
			let walletamount = oServiceModel.getProperty("/WalletAmount");
			let AanipayAmount = oServiceModel.getProperty("/AaniPayAmount");


			if (!cashamount) {
				cashamount = PaymentConstant.initialiseZero;
			}
			if (!cardamount) {
				cardamount = PaymentConstant.initialiseZero;
			}
			if (!Loyaltyamount) {
				Loyaltyamount = PaymentConstant.initialiseZero;
			}
			if (!couponamount) {
				couponamount = PaymentConstant.initialiseZero;
			}
			if (!walletamount) {
				walletamount = PaymentConstant.initialiseZero;
			}
			if (!AanipayAmount) {
				AanipayAmount = PaymentConstant.initialiseZero;
			}

			//let oServiceModel = this.getView().getModel("ServicesViewModel")
			let oGetSalesOrderModel = this.getOwnerComponent().getModel("GetSalesOrderResponse").getData();
			oServiceModel.setProperty("/MyCartTotal", oGetSalesOrderModel.orderTotal);

			let Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(Loyaltyamount) + parseFloat(couponamount) + parseFloat(walletamount) + parseFloat(AanipayAmount);
			let soamount = oServiceModel.getProperty("/MyCartTotal");

			// Check for partialPayment
			var sPartialPaymentFlag = oServiceModel.getProperty("/PartialPaymentFlag");
			if (sPartialPaymentFlag) {
				soamount = oServiceModel.getProperty("/BalancetoPay").toFixed(2);
			}

			let loyaltyId = oGlobalData.LoyaltyID;
			let adnocPluscard = oModel.WalletNumber;
			if (parseFloat(soamount) === parseFloat(Total)) { // Condition to check if so amount and mop amount is matching equal

				if (parseFloat(cardamount) > 0 && parseFloat(AanipayAmount) > 0) {
					MessageToast.show(this.oBundle.getText("msgBankAani"));
				} else {


					if (loyaltyId) {//condition to check whether user has scanned the loyalty id
						var loyaltyamount = oModel.Loyaltyamount;
						var loyaltypoints = oGlobalData.LoyaltyBal;
						var redeemablepoints = parseFloat(loyaltyamount) * 1000;
						if (parseFloat(Loyaltyamount) > PaymentConstant.ArrayZeroLength && parseFloat(walletamount) > PaymentConstant.ArrayZeroLength && adnocPluscard) {
							// if (parseInt(redeemablepoints) < parseFloat(loyaltypoints)) {
							// 	this.onLoyaltySimulation();
							// } else {
							// 	MessageToast.show(this.oBundle.getText("home_messageToastLoyaltyRedeemError"));
							// }
							this.postPayment24();
						}
						else if (parseFloat(walletamount) > PaymentConstant.ArrayZeroLength && !adnocPluscard) {
							this.onpressScanADNOCPlus();
							MessageToast.show(this.oBundle.getText("msgwalletscanError"));
						}
						else if (parseFloat(Loyaltyamount) > PaymentConstant.ArrayZeroLength) {
							if (parseInt(redeemablepoints) < parseFloat(loyaltypoints)) {
								this.onLoyaltySimulation();
							} else {
								MessageToast.show(this.oBundle.getText("home_messageToastLoyaltyRedeemError"));
							}
						}
						else if (parseFloat(walletamount) > PaymentConstant.ArrayZeroLength && adnocPluscard) {// Wallet Redemption
							this.postPayment24();
						}
						else { // Loyalty Accurals
							this.onLoyaltySimulation();
						}
					} else if (adnocPluscard) {
						if (parseFloat(walletamount) > PaymentConstant.ArrayZeroLength) {
							this.postPayment24();
						} else if (parseFloat(Loyaltyamount) > PaymentConstant.ArrayZeroLength && !loyaltyId) {
							// if (parseInt(redeemablepoints) < parseFloat(loyaltypoints)) {
							// 	this.onLoyaltySimulation();
							// } else {
							// 	MessageToast.show(this.oBundle.getText("home_messageToastLoyaltyRedeemError"));
							// }
							this.onPressCheckCard();
							MessageToast.show(this.oBundle.getText("msgLoyaltyScanError"));
						}
						else {
							this.onSavePayment();
						}

					} else {
						if (parseFloat(Loyaltyamount) > PaymentConstant.ArrayZeroLength) {
							this.onPressCheckCard();
							MessageToast.show(this.oBundle.getText("msgLoyaltyScanError"));
						} else if (parseFloat(walletamount) > PaymentConstant.ArrayZeroLength) {
							this.onpressScanADNOCPlus();
							MessageToast.show(this.oBundle.getText("msgwalletscanError"));
						}
						else {
							this.onSavePayment();
							// MessageBox.confirm(
							// 	this.oBundle.getText("home_messageToastAddloyalty"), {
							// 	icon: MessageBox.Icon.CONFIRM,
							// 	title: this.oBundle.getText("msgConfirmation"),
							// 	actions: [MessageBox.Action.YES, MessageBox.Action.NO],
							// 	onClose: function (oAction) {
							// 		if (oAction === this.oBundle.getText("actionYes")) {

							// 			this.onPressCheckCard();
							// 		}
							// 		else if (oAction === this.oBundle.getText("actionNo")) {
							// 			this.onSavePayment();
							// 		}
							// 	}.bind(this)
							// });
							// MessageToast.show(this.oBundle.getText("home_messageToastScanLoyaltyId"));
						}
					}
				}
			} else {
				if (Total === PaymentConstant.ArrayZeroLength) {
					MessageToast.show(this.oBundle.getText("home_messageToastPleaseSelectMOP"));
				} else {

					//  Added to display missed amount on 17-07-2025
					function roundToTwo(num) {
						return Math.round(num * 100) / 100;
					}
					var Balance = roundToTwo(Total - soamount); // MOP Total - Sales Total
					var Balance = Math.abs(Balance);  // ensures positive value
					MessageBox.error(this.oBundle.getText("home_messageToastAmountNotMatch") + " " + Balance + ". " + this.oBundle.getText("common_BalanceMissing"));

				}

			}

		},

		/**
		 * Event triggered to Check Coupon.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onpressCheckCoupon
		 */

		onpressCheckCoupon: function () {
			let oGlobalModelRes = this.getView().getModel("oGlobalModel");
			if (!this.CouponServiesScreen) {
				this.CouponServiesScreen = sap.ui.xmlfragment("adnoc.vi.vehicleinspection.modone.fragment.view.CouponCheck", this);
				this.getView().addDependent(this.CouponServiesScreen);
			}
			this.CouponServiesScreen.open();
			oGlobalModelRes.setProperty("/Coupon_ScanedIDInp", "");
			oGlobalModelRes.setProperty("/Coupon_ScanedIDManualInp", "");

			// added on 11-07-2025
			this.CouponServiesScreen.attachAfterOpen(() => {
				setTimeout(() => {
					// Get all content inside the dialog/fragment
					let aControls = this.CouponServiesScreen.findAggregatedObjects(true, (control) => {
						return control.isA("sap.m.Input"); // Find all Input fields
					});

					if (aControls.length > Constant.ArrayZeroLength) {
						aControls[0].focus(); // Focus the first Input field
					}
				}, 200);
			});
			this.onReadKey()
		},

		/**
		 * Event triggered to Close Coupon.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onCloseCheckCoupon
		 */

		onCloseCheckCoupon: function () {
			let oGlobalModelRes = this.getView().getModel("oGlobalModel");
			this.CouponServiesScreen.close();
			oGlobalModelRes.setProperty("/Coupon_ScanedIDInp", "");
			oGlobalModelRes.setProperty("/Coupon_ScanedIDManualInp", "");
		},

		/**
		 * Event triggered to Close Coupon.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onCheckCoupon
		 */

		onCheckCoupon: function () {
			var couponNo = this.getView().getModel("oGlobalModel").getProperty("/Coupon_ScanedIDManualInp");
			if (couponNo) {
				this.onCheckLoyaltyDiscount();
			} else {
				MessageToast(this.oBundle.getText("msgScanCouponNo"));
			}
		},

		/**
		 * Event triggered to Live Change Coupon.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires oncouponLivechange
		 */

		oncouponLivechange: function (oEvent) {
			var value = oEvent.getSource().getValue();
			// Allow only letters, numbers, and colon (:) added on 18-07-2025
			var value = value.replace(/[^a-zA-Z0-9:]/g, '');
			oEvent.getSource().setValue(value)
			value = value.split("AA1:")[1];
			this._onDecryptLoyaltyId(value, PaymentConstant.coupon);
		},

		/**
		 * Event triggered to Coupon Change Event.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires oncouponchangeevent
		 */

		oncouponchangeevent: function (oEvent) {
			var value = oEvent.getSource().getValue();
			// Allow only letters, numbers, and colon (:) added on 18-07-2025
			var value = value.replace(/[^a-zA-Z0-9:]/g, '');
			oEvent.getSource().setValue(value)
			value = value.split("AA1:")[1];
			this._onDecryptLoyaltyId(value, PaymentConstant.coupon);
		},

		/**
		 * Function triggered to get MOP list and details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 02.04.2025
		 * @fires  _getMopData
		 * @author MM
		 */
		_getMopData: async function () {
			await this.createNewModelUsingAPI(
				Constant.GET,
				'/MOPTypesSet',
				'',
				'MOPTypesModel'
			);
			const oMOPRes = this.getApiResponseObject();

			if (oMOPRes.success) {
				var oServiceModel = this.getView().getModel("ServicesViewModel");
				const oMOPTypeModel = this.getView().getModel("MOPTypesModel").getData();
				const aMopResults = oMOPTypeModel?.results || [];

				if (Array.isArray(aMopResults)) {
					oServiceModel.setProperty("/MopTypes", aMopResults);
				} else {
					oServiceModel.setProperty("/MopTypes", []);
				}
			} else {
				MessageBox.error(oMOPRes?.object?.responseJSON?.error?.message?.value || "Failed to load MOP Types.");
				return;
			}
		},

		/**
		 * Function triggered to Applied Coupons.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 02.04.2025
		 * @fires  onpressAppliedCoupons
		 * @author MM
		 */

		onpressAppliedCoupons: function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			if (!this.CWAppliedCouponFrag) {
				this.CWAppliedCouponFrag = sap.ui.xmlfragment("adnoc.vi.vehicleinspection.modone.fragment.view.AppliedCoupon", this);
				this.getView().addDependent(this.CWAppliedCouponFrag);
			}
			this.CWAppliedCouponFrag.open();
			var Path = oEvent.getSource().getBindingContext("ServicesViewModel").getPath();

			var vIndex = parseInt(Path.substring(Path.lastIndexOf('/') + 1), 10);
			var couponArray = oEvent.getSource().getBindingContext("ServicesViewModel").getObject().vehicleOrderCoupans;

			oServiceModel.setProperty("/AppliedcouponArray", couponArray);
			oServiceModel.setProperty("/CurrentCouponIndex", vIndex);

		},

		/**
		 * Function triggered to Close Coupons.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 02.04.2025
		 * @fires  onCloseAppliedCoupon
		 * @author MM
		 */

		onCloseAppliedCoupon: function () {
			this.CWAppliedCouponFrag.close();
		},


		/**
		 * Event triggered to Scan ADNOC Plus card.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onpressScanADNOCPlus
		 */

		onpressScanADNOCPlus: function () {

			if (!this.ADNOCPlusFrag) {
				this.ADNOCPlusFrag = sap.ui.xmlfragment("adnoc.vi.vehicleinspection.modone.fragment.view.ADNOCPlus", this);
				this.getView().addDependent(this.ADNOCPlusFrag);
			}
			this.ADNOCPlusFrag.open();
			this.getView().getModel("oGlobalModel").setProperty("/ADNOCPlusManualInput", "");

			this.ADNOCPlusFrag.attachAfterOpen(() => {
				setTimeout(() => {
					// Get all content inside the dialog/fragment
					let aControls = this.ADNOCPlusFrag.findAggregatedObjects(true, (control) => {
						return control.isA("sap.m.Input"); // Find all Input fields
					});

					if (aControls.length > Constant.ArrayZeroLength) {
						aControls[0].focus(); // Focus the first Input field
					}
				}, 200);
			});
		},

		/**
		 * Event triggered to Close ADNOC Plus card.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires oncloseAdnocPluscard
		 */
		oncloseAdnocPluscard: function () {
			if (this.ADNOCPlusFrag) {
				this.ADNOCPlusFrag.close();
			}
		},

		/**
		 * Event triggered to get Payment with Customer Detail.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires _getPayment24CustDetails
		 */

		_getPayment24CustDetails: async function (Req) {

			let isANPR = this.getView().getModel("oGlobalModel").getProperty("/walletByANPR");
			let oPayload = {
				crmid: null,
				tokenNumber: isANPR ? null : Req,
				customerId: null,
				vehicleReg: isANPR ? Req : null
			}

			await this.createNewModelUsingAPI(
				Constant.POST,
				`/getP24CustomerDetail`,
				oPayload,
				'GetP24CusDataModel'
			);
			const oP24DetailRes = this.getApiResponseObject();

			if (oP24DetailRes.success) {
				let oGetP24Model = this.getView().getModel("GetP24CusDataModel");
				let oGetP24DetailData = oGetP24Model.getData().results[0];

				// if (oGetP24DetailData.getP24CustomerDetail) {

				// Message text changes on 11-07-2025
				MessageToast.show(this.oBundle.getText("home_messageToastPleaseRemoveCard"), {
					duration: 1500, // Time in milliseconds
					at: "center center", // Position the toast at the center
					my: "center center"  // Align it to the center
				});
				// if (bptype) {
				if (oGetP24DetailData.CustomerGroupCode !== null) {
					let responsedata = oGetP24DetailData;
					var balance = responsedata.Balance;
					var p24Customer = responsedata.FullName.trim();
					var P24Accountnumber = responsedata.AccountNumber;
					var PayerNo = responsedata.PayerNo;
					var CustomerGroupCode = responsedata.CustomerGroupCode;

					if (this.ADNOCPlusFrag && this.ADNOCPlusFrag.isOpen()) {
						this.ADNOCPlusFrag.close();
					}
					let oGlobalModel = this.getView().getModel("oGlobalModel");
					oGlobalModel.setProperty("/P24Accountnumber", P24Accountnumber);
					oGlobalModel.setProperty("/P24Balance", balance);
					oGlobalModel.setProperty("/P24Customer", p24Customer);
					oGlobalModel.setProperty("/PayerNo", PayerNo);
					oGlobalModel.setProperty("/CustomerGroupCode", CustomerGroupCode);
					this.getView().getModel("ServicesViewModel").setProperty("/WalletNumber", AdnocPlusCardNo);
					// this.getView().getModel("ServicesViewModel").setProperty("/PayerNo", PayerNo);
					var AdnocPlusCardNoMasked = AdnocPlusCardNo.replace(AdnocPlusCardNo.substring(3, AdnocPlusCardNo.length - 2), "******");
					oGlobalModel.setProperty("/WalletNumberMask", AdnocPlusCardNoMasked);
				} else {
					MessageToast.show(this.oBundle.getText("msgwalletTypeError") + " " + bptype)
				}
				//}
				//}
			} else {
				let oResponse = JSON.parse(oP24DetailRes.object.responseText);
				MessageBox.error(oResponse.error?.message?.value);
				return;
			}

		},

		/**
		 * Event triggered to Manual get Adnoc Plus card.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onManualcheckAdnocplus
		 */

		onManualcheckAdnocplus: function () {
			var adnocpluscardno = this.getView().getModel("oGlobalModel").getProperty("/ADNOCPlusManualInput");
			if (adnocpluscardno) {
				this._getPayment24CustDetails(adnocpluscardno);
			} else {
				MessageToast.show(this.oBundle.getText("msgEnterADNOCPlusCardno"));
			}
		},

		/**
		 * Event triggered to Post Payment24
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires postPayment24
		 */

		postPayment24: async function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			let oSalesOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
			let aServiceItems = oSalesOrderCardModel.getProperty("/MyCartItems");
			oServiceModel.setProperty("/MyCartItems", aServiceItems);

			let oModel = oServiceModel.getData();
			let oGlobalModel = this.getView().getModel("oGlobalModel");
			let oGlobalData = oGlobalModel.getData();
			let currdate = new Date();
			currdate = Formatter.getDateFromatIn_yyyyMMdd(currdate);
			var articlesarr = [];
			for (var i = 0; i < oModel.MyCartItems.length; i++) {
				var obj = {
					"amount": parseFloat(oModel.MyCartItems[i].TotalAmount),
					"productCode": oModel.MyCartItems[i].Material,
					"productName": oModel.MyCartItems[i].ServiceName,
					"quantity": oModel.MyCartItems[i].Qty,
					"vatAmount": parseFloat(oModel.MyCartItems[i].VAT),
					"vatPercentage": PaymentConstant.vatPercentage
				};
				articlesarr.push(obj);
			}
			var payload = {
				"terminalSerialNumber": "",
				"merchantNumber": oGlobalData.MainPlantSiteNo,
				"attendant": null,
				"totalAmount": parseFloat(oModel.WalletAmount),
				"odometerReading": "",
				"driverCard": "",
				"pumpNumber": "",
				"paymentMethod": "",
				"dateTime": currdate,
				"referencenumber": oModel.UTRN,
				"product": articlesarr,
				"customer": {
					"crmId": null,
					"tokenNumber": oGlobalData.WalletNumber,
					"vehicleReg": null
				},
				"type": PaymentConstant.payment24auth,
				"validationRules": {
					"validateProduct": false,
					"validateAttendant": false,
					"validateCustomerPin": false
				},
				"businessDateTime": currdate
			};

			var sInput = JSON.stringify(payload);

			await this.createNewModelUsingAPI(
				Constant.POST,
				'/getPaymentP24',
				sInput,
				'PaymentP24Model'
			);

			let oPaymentResModel = this.getView().getModel("PaymentP24Model");

			let oResponse = this.getApiResponseObject();
			if (oResponse.success) {
				let oPaymentP24Data = oPaymentResModel.getData().results
				if (oPaymentP24Data.getPaymentP24.message === PaymentConstant.payment24msg && oPaymentP24Data.getPaymentP24.transactionId) {
					oModel.walletAuthcode = oPaymentP24Data.getPaymentP24.transactionId.toString();
					oServiceModel.refresh();

					var loyaltyamount = oModel.Loyaltyamount;
					if (parseFloat(loyaltyamount) > Constant.ArrayZeroLength) {
						var loyaltypoints = oGlobalData.LoyaltyBal;
						var redeemablepoints = parseFloat(loyaltyamount) * 1000;
						if (parseInt(redeemablepoints) < parseFloat(loyaltypoints)) {
							this.onLoyaltySimulation();
						} else {
							MessageToast.show(this.oBundle.getText("msgLoyaltyRedeemError1"));
						}
					} else {
						this.onSavePayment();
					}
				} else {
					MessageToast.show(this.oBundle.getText("walletError"));
				}
			} else {
				let oRes = JSON.parse(oResponse.object.responseText);
				MessageBox.error(oRes.error?.message?.value);
				return;
			}
		},

		/**
		 * Event triggered to Loyalty Simulation
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires onLoyaltySimulation
		 */


		onLoyaltySimulation: async function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			let oSalesOrderCardModel = this.getView().getModel("SalesOrderCardDataModel");
			let aServiceItems = oSalesOrderCardModel.getProperty("/MyCartItems");
			oServiceModel.setProperty("/MyCartItems", aServiceItems);

			var oModel = oServiceModel.getData();
			var oGlobalModel = this.getView().getModel("oGlobalModel");
			var oGlobalData = oGlobalModel.getData();
			var Partner = PaymentConstant.LineofBusiness;
			var AED = PaymentConstant.Currency;
			var Category = PaymentConstant.LoyaltyMatCategory;
			var location = oGlobalData.MainPlantSiteNo
			var Comment = PaymentConstant.LoyaltyComment;

			var loyaltyId = oGlobalData.LoyaltyID;
			if (loyaltyId) {

				var Itemsarr = [];
				var item = 10;
				var couponarr = [];
				for (var i = 0; i < oModel.MyCartItems.length; i++) {
					var amount = parseFloat(oModel.MyCartItems[i].SubTotalAfterDis) * parseInt(oModel.MyCartItems[i].Qty);

					var itemstring = item.toString();
					var obj = {
						"lineNo": parseInt(itemstring),
						"code": oModel.MyCartItems[i].Material,
						"category": oModel.MyCartItems[i].ProductHierarchy,
						"name": oModel.MyCartItems[i].ServiceName,
						"quantity": parseFloat(oModel.MyCartItems[i].Qty),
						"amount": parseFloat(amount),
						"discounted": false
					};
					item = item + 10;
					Itemsarr.push(obj);
					couponarr = couponarr.concat(oModel.MyCartItems[i].vehicleOrderCoupans);
				}

				var arrCoupon = [];
				couponarr.forEach(function (item) {
					arrCoupon.push(item.couponNumber);
				});

				// below condiction added on 14-07-2025 field pass in below payload -burnPoints-
				var redeemablepoints = null;
				var loyaltyamount = oModel.Loyaltyamount;
				if (parseFloat(loyaltyamount) > PaymentConstant.ArrayZeroLength) {
					redeemablepoints = parseFloat(loyaltyamount) * 1000;
				} else {
					redeemablepoints = null;
				}

				var currdate = new Date();
				currdate = Formatter.getDateFromatIn_yyyyMMdd(currdate);

				// Passing the MOP info to the payload
				var cashamount = oModel.Cashamount;
				var cardamount = oModel.CardAmount;
				var AanipayAmount = oModel.AaniPayAmount;
				var Loyaltyamount = oModel.Loyaltyamount;
				var walletAmount = oModel.WalletAmount;
				var paymentmethods = [];

				if (parseFloat(cardamount) > PaymentConstant.ArrayZeroLength) {
					paymentmethods.push({
						"code": PaymentConstant.cardLoyaltyMOP,
						"amount": parseFloat(cardamount)
					});
				}
				if (parseFloat(walletAmount) > PaymentConstant.ArrayZeroLength) {
					paymentmethods.push({
						"code": PaymentConstant.smartpayLoyaltyMOP,
						"amount": parseFloat(walletAmount)
					});
				}
				if (parseFloat(Loyaltyamount) > PaymentConstant.ArrayZeroLength) {
					paymentmethods.push({
						"code": PaymentConstant.smartpayLoyaltyMOP,
						"amount": parseFloat(Loyaltyamount)
					});
				}
				if (parseFloat(cashamount) > PaymentConstant.ArrayZeroLength) {
					paymentmethods.push({
						"code": PaymentConstant.cashLoyaltyMOP,
						"amount": parseFloat(cashamount)
					});
				}
				if (parseFloat(AanipayAmount) > PaymentConstant.ArrayZeroLength) {
					paymentmethods.push({
						"code": PaymentConstant.cardLoyaltyMOP,
						"amount": parseFloat(AanipayAmount)
					});
				}

				var sInput = {
					"comment": Comment,
					"partner": PaymentConstant.CLMPartner,
					"location": location,
					"date": currdate,
					"currencyCode": AED,
					"paymentMethods": paymentmethods,
					"trnNo": "",
					"coupons": arrCoupon,
					"burnPoints": redeemablepoints,
					"products": Itemsarr,
					"lineOfBusiness": Partner,
					"businessDate": oGlobalData.EmployeeData.BusinessDate,
				}

				let oPayload = {
					Payload: sInput,
					loyaltyID: loyaltyId,
					simulation: true
				}

				await this.createNewModelUsingAPI(
					Constant.POST,
					'/fetchInputDetails',
					oPayload,
					'LoyaltySimulationModel'
				);

				let oResponse = this.getApiResponseObject();
				if (oResponse.success) {
					let oLoyaltySimulationModel = this.getView().getModel("LoyaltySimulationModel");
					let response = oLoyaltySimulationModel.getData().results[0].responseData;

					let discountedproducts = response.products;

					if (discountedproducts.length !== PaymentConstant.ArrayZeroLength) {
						var productlength = oModel.MyCartItems.length;
						var count = PaymentConstant.ArrayZeroLength;
						count = discountedproducts.filter(p => parseFloat(p.moneyDiscount) === PaymentConstant.ArrayZeroLength).length;
						var loyaltymsg = "";
						if (productlength === count) {
							loyaltymsg = this.oBundle.getText("msgCLMNoDiscounts");
						} else {
							loyaltymsg = this.oBundle.getText("msgCLMPromt1") + "\n" + this.oBundle.getText("msgCLMPromt2");
						}
						var appliedcoupons = [];
						for (var i = 0; i < discountedproducts.length; i++) {
							for (var j = 0; j < oModel.MyCartItems.length; j++) {
								if (oModel.MyCartItems[j].Material.toString() === discountedproducts[i].code) {
									oModel.MyCartItems[j].DiscountAmount = parseFloat(discountedproducts[i].moneyDiscount).toFixed(2);
									if (parseFloat(discountedproducts[i].moneyDiscount) > PaymentConstant.ArrayZeroLength) {
										var condCurrency = PaymentConstant.Currency;
										appliedcoupons.push({
											"couponNumber": arrCoupon[0],
											"condType": null, //oModel.itemFixedCD6,
											"condValue": -parseFloat(oModel.MyCartItems[j].DiscountAmount),
											"condCurrency": condCurrency
										});
										oModel.MyCartItems[j].vehicleOrderCoupans = appliedcoupons;
									}
								}
							}
						}
						var usedCoupons;
						if (response.usedCoupons) {
							usedCoupons = response.usedCoupons;
						} else {
							usedCoupons = [];
						}

						if (usedCoupons.length !== 0) {
							usedCoupons = usedCoupons.filter(key => key.useResult === PaymentConstant.CouponUsed);
						}
						for (var i = 0; i < usedCoupons.length; i++) {
							if (oModel.MyCartItems[i] !== undefined) {
								oModel.MyCartItems[i].vehicleOrderCoupans[i].couponNumber = usedCoupons[i].couponNumber;
							}
						}

						if (loyaltymsg === this.oBundle.getText("msgCLMNoDiscounts")) {
							arrCoupon.splice(-1) // removing the last coupon if no discounts found
						}
						var ServiceItemsarr = oServiceModel.getData().MyCartItems;
						var Total = ServiceItemsarr.map(o => o.TotalAmount).reduce((a, c) => {
							return parseFloat(a) + parseFloat(c)
						});

						// Check any discount amount in cart items
						var DisAmount = ServiceItemsarr.map(o => o.DiscountAmount).reduce((a, c) => {
							return parseFloat(a) + parseFloat(c)
						});
						var Total = Total - DisAmount;

						oServiceModel.getData().MyCartTotal = parseFloat(Total).toFixed(2);
						oServiceModel.getData().MyCartTotalDiscount = parseFloat(DisAmount).toFixed(2);


						oServiceModel.setProperty("/couponArray", arrCoupon); // Send to BG
						oGlobalModel.setProperty("/Coupon_ScanedIDManualInp", "");
						oServiceModel.refresh();
						// Below validation code modified based on above validation added on 14-07-2025
						if (loyaltymsg === this.oBundle.getText("msgCLMNoDiscounts")) {
							if (redeemablepoints !== null) {
								if (response.burnPoints === redeemablepoints) {
									this.onPressRedeemLoyalty();
								} else if (parseFloat(oModel.Loyaltyamount) > PaymentConstant.ArrayZeroLength && response.burnPoints === PaymentConstant.ArrayZeroLength) {
									MessageToast.show(this.oBundle.getText("noLoyaltyRedemption"));
								} else if (response.burnPoints < redeemablepoints) {
									var redeeamableamount = response.burnPointsMoney;
									MessageBox.error(this.oBundle.getText("maxAllowedLoyaltyPoints") + "\n" + " " + response.burnPoints.toString() +
										this.oBundle.getText("maxAllowedLoyaltyPoints1") + "\n" + this.oBundle.getText("maxAllowedLoyaltyPoints2") + " " + redeeamableamount.toString() + this.oBundle.getText("currency_AED"));
								} else if (response.bonusPoints > PaymentConstant.ArrayZeroLength || response.bonusPoints === PaymentConstant.ArrayZeroLength || parseFloat(oModel.Loyaltyamount) === PaymentConstant.ArrayZeroLength) {
									this.onPressRedeemLoyalty();
								}
							} else {
								this.onPressRedeemLoyalty();
							}
						} else {
							var process = PaymentConstant.simulate;
							this.onBtnPressUpdateSalesOrder(process);
						}

					} else {
						this.onPressRedeemLoyalty();
					}
				}
				else {
					let oRes = JSON.parse(oResponse.object.responseText);
					MessageBox.error(oRes.error?.message?.value);
					return;
				}

			} else {
				MessageToast.show(this.oBundle.getText("msgLoyaltyScanError"));
				this.onPressCheckCard();
			}
		},

		/**
		 * Function to Change Manual.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires onLiveChangeManualInput, 
		 * @author MM
		 */

		onLiveChangeManualInput: function (oEvent) {
			var oValue = oEvent.getSource().getValue();
			var RemoveSpecialChar = oValue.replace(/[^a-zA-Z0-9-]/g, "");
			oEvent.getSource().setValue(RemoveSpecialChar);
		},

		/**
		 * Function to Triggred Reset Loyalty.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires onResetLoyalty, 
		 * @author MM
		 */

		// Reset loyalty details 
		onResetLoyalty: function () {
			MessageBox.confirm(this.oBundle.getText("mainMenu_messageBoxLoyaltyReset"), {
				icon: MessageBox.Icon.CONFIRM,
				title: this.oBundle.getText("msgConfirmation"),
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {

						var oGlobalModelRes = this.getView().getModel("oGlobalModel");
						var oServiceModel = this.getView().getModel("ServicesViewModel");
						oGlobalModelRes.setProperty("/LoyaltyID", "");
						oGlobalModelRes.setProperty("/LoyaltyIDMasked", "");
						oGlobalModelRes.setProperty("/LoyaltyBal", "");
						oGlobalModelRes.setProperty("/LoyaltyCustName", "");
						oGlobalModelRes.setProperty("/LoyaltyTierName", "");
						oServiceModel.setProperty("/Loyaltyamount", PaymentConstant.initialiseZero);
						oServiceModel.setProperty("/LoyaltyMOPPanelExpand", false);
						oServiceModel.setProperty("/Loyalty_CheckBoxSeleted", false);
						oGlobalModelRes.refresh();
						// CLose if any fragment is open
						if (this.RewardCheckFrag) {
							if (this.RewardCheckFrag.isOpen()) {
								this.RewardCheckFrag.close();
							}
						}
					} else if (oAction === this.oBundle.getText("actionNo")) {
						// No action
					}
				}.bind(this)
			});
		},

		/**
		 * Function to Triggred Reset Wallet.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires onResetWallet, 
		 * @author MM
		 */

		onResetWallet: function () {
			MessageBox.confirm(this.oBundle.getText("mainMenu_messageBoxWalletReset"), {
				icon: MessageBox.Icon.CONFIRM,
				title: this.oBundle.getText("msgConfirmation"),
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {
						var oGlobalModelRes = this.getView().getModel("oGlobalModel");
						var oServiceModel = this.getView().getModel("ServicesViewModel");
						oGlobalModelRes.setProperty("/WalletNumber", "");
						oGlobalModelRes.setProperty("/WalletNumberMask", "");
						oGlobalModelRes.setProperty("/P24Balance", "");
						oGlobalModelRes.setProperty("/P24Customer", "");
						oGlobalModelRes.setProperty("/P24Accountnumber", "");
						oGlobalModelRes.setProperty("/PayerNo", "");
						oServiceModel.setProperty("/WalletAmount", PaymentConstant.initialiseZero);
						oServiceModel.setProperty("/WalletMOPPanelExpand", false);
						oServiceModel.setProperty("/Wallet_CheckBoxSeleted", false);
						oGlobalModelRes.refresh();
						// CLose if any fragment is open
						if (this.ADNOCPlusFrag && this.ADNOCPlusFrag.isOpen()) {
							this.ADNOCPlusFrag.close();
						}

					} else if (oAction === this.oBundle.getText("actionNo")) {
						// No action
					}
				}.bind(this)
			});
		},

		/**
		 * Function to Triggred Tab Selection.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires checkTabSelection
		 * @author MM
		 */

		checkTabSelection: function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			const oIconTabBar = this.getView().byId(ControlIds.PaymentIntegration.PAYMENT_CART);
			const sSelectedKey = oIconTabBar.getSelectedKey();
			if (sSelectedKey === PaymentConstant.Cart) {
				oServiceModel.setProperty("/PaymentButtomVisible", false);
			} else {
				oServiceModel.setProperty("/PaymentButtomVisible", true);
				oServiceModel.setProperty("/MOPVisible", true);
				this._clearMOP();
			}

		},

		/**
		 * Function to Triggred Update Order For Re-Test
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires _updateOrderForReTest
		 * @author MM
		 */

		_updateOrderForReTest: async function () {
			let oReTestModel = this.getOwnerComponent().getModel("ReTestForOrderModel");
			const oOrderResModel = this.getOwnerComponent().getModel("GetSalesOrderResponse").getData();

			let aReTestData = oReTestModel || [];
			// 1. Get arrays from ReTest model
			let aServiceRequestNos = Array.isArray(aReTestData) ? aReTestData.map(obj => obj.orderNo) : [];
			let sVehUUID = Array.isArray(aReTestData) ? aReTestData.map(obj => obj.vehicleOrderInspectionLines) : [];
			let sTestType = Array.isArray(aReTestData) ? aReTestData.map(obj => obj.inspectionType) : [];

			let bIsReTest = oReTestModel?.IsReTest === true; // ReTest check
			let aChildData = [];

			// 2. Build aChildData with null fallback for fresh test
			oOrderResModel.VehOrdInspDetails.results.forEach((detail, index) => {
				let serviceRequestNo = oOrderResModel.serviceRequestNo;
				let vehicleOrderInspectionUUID = oOrderResModel.vehicleOrderInspectionUUID;

				detail.vehOrdInspLines.results.forEach((line) => {
					aChildData.push({
						prevVehicleOrderInspectionLines: bIsReTest ? sVehUUID[index] || null : null,
						prevTestType: bIsReTest ? sTestType[index] || null : null,
						prevServiceRequestNo: bIsReTest ? aServiceRequestNos[index] || null : null,
						currVehicleOrderInspectionLines: line.vehicleOrderInspectionLines,
						currMaterialCode: line.materialCode,
						currTestType: line.inspectionType,
						currOrderLineNo: line.orderLineNo,
						currServiceRequestNo: serviceRequestNo,
						currVehicleOrderInspectionUUID: vehicleOrderInspectionUUID
					});
				});
			});

			// 3. Payload structure
			let oPayload = {
				aPrevServiceRequestNos: bIsReTest ? [...new Set(aServiceRequestNos)] : null,
				aChildData: aChildData
			};

			await this.createNewModelUsingAPI(
				Constant.POST,
				'/executeMahaTests',
				oPayload,
				'UpdateOrderReTestModel'
			);

			let oUpdateOrderResModel = this.getView().getModel("UpdateOrderReTestModel");

			let oResponse = this.getApiResponseObject();
			if (oResponse.success) {
				console.log(oUpdateOrderResModel)
			} else {
				let oRes = JSON.parse(oResponse.object.responseText);
				console.log(oRes);
			}
		},

		/**
		 * Function to Triggred go to next tab
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires onBtnPressProceed
		 * @author MM
		 */

		onBtnPressProceed: function () {
			let oIconTabBar = this.byId(ControlIds.PaymentIntegration.PAYMENT_CART);
			let sCurrentKey = oIconTabBar.getSelectedKey();
			let aItems = oIconTabBar.getItems();

			for (let i = 0; i < aItems.length; i++) {
				if (aItems[i].getKey() === sCurrentKey && i < aItems.length - 1) {
					let sNextKey = aItems[i + 1].getKey();
					oIconTabBar.setSelectedKey(sNextKey);
					break;
				}
				if (aItems[i].getKey() === PaymentConstant.Representative) {
					oIconTabBar.setSelectedKey(PaymentConstant.Payment);
					break;
				}
			}
			this.checkTabSelection();
		},

		/**
		 * Function to Triggred to Back Service Screen to select More Services
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires onBtnPressBackFromCart
		 * @author MM
		 */

		onBtnPressBackFromCart: async function () {
			let oGlobalModelRes = this.getView().getModel("oGlobalModel");
			let oUpdateStatusModel = this.getView().getModel("ButtonVisibleModel");
			if (oUpdateStatusModel.getData().UpdatebtnVisible) {
				MessageBox.warning(this.oBundle.getText("payment_messageBoxPleaseupdateSalesOrder"));
				return
			}
			this._clearMOP();
			oGlobalModelRes.setProperty("/IsFromPayment", true);
			if (oGlobalModelRes.getProperty("/isServicePage")) {
				const oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo(Constant.Services, { from: Constant.TESTMODE.FRESHTEST }, true);
			} else {
				const oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo(Constant.AccessoriesList, true);
			}

		},

		/**
		 * Function triggered to close MOP Details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires _clearMOP 
		 * @author MM
		 */
		_clearMOP: function () {
			var oServiceModel = this.getView().getModel("ServicesViewModel");
			var oGlobalModelRes = this.getView().getModel("oGlobalModel");
			oServiceModel.setProperty("/CashMOPPanelExpand", false);
			oServiceModel.setProperty("/Cashamount", PaymentConstant.initialiseZero);

			oServiceModel.setProperty("/CardMOPPanelExpand", false);
			oServiceModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);
			oServiceModel.setProperty("/Authcode", "");

			oServiceModel.setProperty("/AanipayMOPPanelExpand", false);
			oServiceModel.setProperty("/AaniPayAmount", PaymentConstant.initialiseZero);

			oServiceModel.setProperty("/LoyaltyMOPPanelExpand", false);
			oServiceModel.setProperty("/Loyaltyamount", PaymentConstant.initialiseZero);

			oServiceModel.setProperty("/CouponMOPPanelExpand", false);
			oServiceModel.setProperty("/CouponAmount", PaymentConstant.initialiseZero);

			oServiceModel.setProperty("/WalletMOPPanelExpand", false);
			oServiceModel.setProperty("/WalletAmount", PaymentConstant.initialiseZero);

			oGlobalModelRes.setProperty("/isCouponApplied", false);
			oGlobalModelRes.setProperty("/isAddMoreVehicle", false);
			oGlobalModelRes.setProperty("/Coupon_Msg", "");
			oServiceModel.setProperty("/CLMMessage", "");
			oGlobalModelRes.setProperty("/LoyaltyID", "");
			oGlobalModelRes.setProperty("/Coupon_Number", "");
			oGlobalModelRes.setProperty("/Coupon_SavedAmt", "");
			this._toggleRepresentativeEditMode(false);
		},

		/**
		 * Function triggered Coomon Functionality to set Flag Non Editable SAVE,EDIT,CANCEL.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires _toggleRepresentativeEditMode 
		 * @author MM
		 */

		_toggleRepresentativeEditMode: function (bEditMode) {
			const aEditableFields = [
				'respRadioEmail', 'respRadioSMS',
				'respIDType', 'respID', 'respName', 'respEmail',
				'respMobile', 'respFromDate', 'respToDate'
			];

			// Toggle all input/radio fields' editable property
			aEditableFields.forEach((sId) => {
				const oControl = this.byId(sId);
				if (oControl) {
					oControl.setEditable(bEditMode);
				}
			});

			// Toggle buttons
			this.byId('edit').setVisible(!bEditMode);
			this.byId('resViewBtn').setVisible(bEditMode);
			this.byId('resCameraBtn').setVisible(bEditMode);
			this.byId('emiratesBtn').setVisible(bEditMode);
			this.byId('save').setVisible(bEditMode);
			this.byId('cancel').setVisible(bEditMode);
		},

		/**
		 * Function triggered to Edit Represntative Detail
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires onBtnPressEditRespo 
		 * @author MM
		 */

		onBtnPressEditRespo: function () {
			this._toggleRepresentativeEditMode(true);
		},

		/**
		 * Function triggered to Edit Represntative Detail
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2025
		 * @fires onBtnPressSaveRespo 
		 * @author MM
		 */

		onBtnPressSaveRespo: function () {

			let oCustomerInfoModel = this.getView().getModel("SalesOrderCardDataModel");
			let oCustInfo = oCustomerInfoModel.getProperty("/CustomerInfo");
			const fields = [
				"mobileNo",
				"emailAddress",
				"emiratesFromDate",
				"emiratesToDate",
				"firstName",
				"lastName",
				"emiratesId"
			];

			let isEmpty = fields.some(key => {
				const value = oCustInfo[key];
				return value === "" || value === null || value === undefined;
			});

			if (isEmpty) {
				MessageBox.warning(this.oBundle.getText("payment_messageBoxRequiredMsg"));
				return;
			}

			let oFileUploadModel = this.getView().getModel("FileUploadedModel").getData();
			let isFileMissing = false;

			oFileUploadModel.FileCategory.forEach(category => {
				if (!category.Files.base64File) {
					isFileMissing = true;
				}
			});

			if (isFileMissing) {
				MessageBox.warning(this.oBundle.getText("payment_messageBoxAttachmentMsg"));
				return;
			}
			this._toggleRepresentativeEditMode(false);
			var process = PaymentConstant.FlagRepres;
			this.onBtnPressUpdateSalesOrder(process);
		},

		/**
		 * Function triggered to Edit Represntative Detail
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires onBtnPressCancel 
		 * @author MM
		 */

		onBtnPressCancelRespo: function () {
			let oCustomerInfoModel = this.getView().getModel("SalesOrderCardDataModel");
			let oCustPrevInfo = oCustomerInfoModel.getProperty("/CustomerInfoPrev");
			MessageBox.confirm(
				this.oBundle.getText("payment_messageBoxPleaseCancelRepresentative"), {
				icon: MessageBox.Icon.CONFIRM,
				title: this.oBundle.getText("msgConfirmation"),
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {
						let oRestoredData = {
							emiratesId: oCustPrevInfo.emiratesId,
							firstName: oCustPrevInfo.firstName,
							lastName: oCustPrevInfo.lastName,
							mobileNo: oCustPrevInfo.mobileNo,
							emailAddress: oCustPrevInfo.emailAddress,
							commTypeWhatsapp: oCustPrevInfo.commTypeWhatsapp,
							commTypeMail: oCustPrevInfo.commTypeMail,
							commTypeSMS: oCustPrevInfo.commTypeSMS,
							idType: oCustPrevInfo.idType,
							emiratesFromDate: oCustPrevInfo.emiratesFromDate,
							emiratesToDate: oCustPrevInfo.emiratesToDate,
							AttachmentId: oCustPrevInfo.AttachmentId
						};

						// Update model
						oCustomerInfoModel.setProperty("/CustomerInfo", oRestoredData);
						this._toggleRepresentativeEditMode(false);
						MessageToast.show(this.oBundle.getText("payment_messageBoxPrevUndo"));
					}
				}.bind(this)
			});
		},

		/**
		 * Call this function after saving customer and vehicle data and fetch detail 
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version: 1.0.0
		 * @since: 20.10.2025
		 * @fires: onSelectIDType
		 * @author: MM
		 * */

		onSelectIDType: function (oEvent) {

			const sKey = oEvent.getSource().getSelectedKey();
			const oInput = this.byId("respID");
			this.getView().getModel("SalesOrderCardDataModel").setProperty("/CustomerInfo/idType", sKey);
			oInput.setValue("");
			switch (sKey) {
				case Constant.EIDVAL:
					oInput.setMask(this.oBundle.getText("customer_Mask_Emirates"));
					oInput.setPlaceholder(this.oBundle.getText("customer_formate"));
					break;
				case Constant.PASSPORTVAL:
					oInput.setMask(this.oBundle.getText("customer_Mask_Passport"));
					oInput.setPlaceholder(this.oBundle.getText("customer_EnterPassportNumber"));
					break;
				case Constant.DRIVINGLVAL:
					oInput.setMask(this.oBundle.getText("customer_Mask_DLicence"));
					oInput.setPlaceholder(this.oBundle.getText("customer_EnterDrivingLicenseNumber"));
					break;
				default:
					oInput.setPlaceholder(this.oBundle.getText("customer_DefaultId"));
			}
		},

		onExpiryDateChange: function (oEvent) {
			var dateValue = oEvent.getSource().getDateValue(); // JS Date object
			var today = new Date();
			today.setHours(0, 0, 0, 0);

			if (dateValue && dateValue < today) {
				MessageToast.show(this.oBundle.getText("pertmit_MessageToastPastDateNotAllowed"));
				oEvent.getSource().setValue(null); // Clear invalid date
			}
		},

		/**
		 * Event triggered to read Emirates Card Details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.08.2025
		 * @author MM
		 * @fires onpressreadEmiratesIDRespo
		 */

		onpressreadEmiratesIDRespo: function () {
			let source = Constant.EmiratedId;
			this.onReadEmiratesCardRespo(source);
		},

		/**
		 * Event triggered to read Emirates Card Details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 15.08.2025
		 * @author MM
		 * @fires onReadEmiratesCardRespo
		 */
		onReadEmiratesCardRespo: function (source) {
			MessageToast.show(this.oi18nModel.getProperty("home_messageToastPleaseInsertCard"));
			// let sButtonText = oEvent.getSource().mProperties.text;
			$.ajax({
				url: PaymentConstant.EidCardURL,
				method: Constant.GET,
				dataType: 'json',
				success: function (data) {
					let base64string = data.cardData;
					let decodedstring = atob(base64string);
					let parsedstring = JSON.parse(decodedstring);

					MessageToast.show(this.oi18nModel.getProperty("home_messageToastPleaseRemoveCard"));  // Message text changes on 11-07-2025

					if (source === Constant.EmiratedId) {
						// Read card to get customer details in create customer fragemnt
						let oCustomerInfoModel = this.getView().getModel("SalesOrderCardDataModel");
						let isecondspace = 3; // second space
						let splitstring = parsedstring.fullName.split(' ')
						let firstname = splitstring.slice(0, isecondspace).join(' ')
						let secondname = splitstring.slice(isecondspace).join(' ');

						let EID = parsedstring.emiratesId;
						EID = EID.split("-")[1];

						let mobile = parsedstring.mobile;
						if (mobile.match("971") !== null) {
							mobile = mobile.substr(3, mobile.length);
							oCustomerInfoModel.setProperty("/CustomerInfo/mobileNo", mobile);
						} else {
							oCustomerInfoModel.setProperty("/CustomerInfo/mobileNo", mobile);
						}
						oCustomerInfoModel.setProperty("/CustomerInfo/firstName", firstname + secondname);
						oCustomerInfoModel.setProperty("/CustomerInfo/emailAddress", parsedstring.email);
						oCustomerInfoModel.setProperty("/CustomerInfo/emiratesId", EID);
					}

				}.bind(this),
				error: function (jqXHR, textStatus, errorThrown) {
					MessageToast.show(this.oi18nModel.getProperty("home_messageToastErrorfetchingcarddata"));
				}.bind(this)
			});

		},

		/**
		 * This function is Open Camera fragment for Capture Image 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		 * @version 1.0.0
		 * @since 19.09.2025
		 * @fires 
		 * @author MM
		 */
		onCaptureImageForRespo: function () {
			// Now open the camera dialog
			this.onCaptureImage();
		},


		/**
		* Functon for Captured Image from Camera
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onCaptureImage
		* @author MM
		*/

		onCaptureImage: function (oEvent) {
			const that = this;

			if (!this._cameraDialog) {
				this._cameraDialog = sap.ui.xmlfragment(this.getView().getId(), "adnoc.vi.vehicleinspection.modone.fragment.view.CameraCapture", this);
				this.getView().addDependent(this._cameraDialog);
			}

			this._cameraDialog.open();

			// Start camera after open
			setTimeout(() => {
				navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
					.then(function (stream) {
						that._cameraStream = stream;
						const videoElement = document.getElementById("cameraStream");
						if (videoElement) {
							videoElement.srcObject = stream;
						}
					})
					.catch(function (err) {
						MessageBox.error(this.oBundle.getText("traffic_MessageBoxForCameraAccess") + ' ' + err.message);
					});
			}, 500); // Delay for dialog rendering
		},

		/**
		* Functon for Take Photo
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onTakePhoto
		* @author MM
		*/

		onTakePhoto: function () {
			const video = document.getElementById("cameraStream");
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext("2d");
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			const that = this;
			canvas.toBlob(function (blob) {
				const timestamp = Date.now();
				const randomString = Math.random().toString(36).substring(2, 8);
				const filename = `captured_${timestamp}_${randomString}.jpg`;
				const file = new File([blob], filename, { type: "image/jpeg" });

				if (file) {
					that.byId('resViewBtn').setVisible(true);
				}
				that.onBtnPressTrafficFileChange(file);
				MessageToast.show(that.oBundle.getText("traffic_MessageBoxForImageCaptured"));
				that.onCloseCameraDialog(); // Optional: close after capture
			}, "image/jpeg");
		},

		/**
		* Functon for File Change when upload files
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressTrafficFileChange
		* @author MM
		*/

		onBtnPressTrafficFileChange: function (oEventOrFiles) {
			const oModel = this.getView().getModel("FileUploadedModel");
			const oModelData = oModel.getData();
			let aFiles = [];
			let oFileUploader;

			// Single or multiple File(s) passed directly (e.g., from camera)
			if (Array.isArray(oEventOrFiles)) {
				aFiles = oEventOrFiles;

			} else if (oEventOrFiles instanceof File) {
				aFiles = [oEventOrFiles];
			} else {
				// Normal file uploader input
				oFileUploader = oEventOrFiles.getSource();
				const fileList = oEventOrFiles.getParameter("files");
				aFiles = Array.from(fileList);

				const oContext = oFileUploader.getBindingContext("FileUploadedModel");

				if (!oContext) {
					return;
				}

			}

			const oSelectedCategory = oModelData.FileCategory[0];
			if (!oSelectedCategory) {
				return;
			}

			if (!oSelectedCategory.Files) {
				oSelectedCategory.Files = [];
			}

			// Max file validation
			if (oSelectedCategory.Files.length + aFiles.length > 5) {
				MessageBox.warning(this.oBundle.getText("traffic_MessageBoxForFileMaxSize"));
				if (oFileUploader) oFileUploader.setValue("");
				return;
			}

			aFiles.forEach((file) => {
				if (file.size > 10 * 1024 * 1024) {
					MessageBox.warning(this.oBundle.getText("traffic_MessageBoxForFileMBSize"));
					if (oFileUploader) oFileUploader.setValue("");
					return;
				}

				this._readFileAsBase64Multiple(file, (base64) => {
					oSelectedCategory.Files = {
						attachmentName: file.name,
						orgFileExtension: file.name.split('.').pop(),
						orgFileName: file.name,
						base64File: base64,
						source: file._source || "upload"
					};

					oModel.refresh(true);
				});
			});
		},

		/**
		* Functon for Generate Base64 Structure for Attachment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 10.02.2025
		* @fires _readFileAsBase64Multiple
		* @author MM
		*/

		_readFileAsBase64Multiple: function (file, callback) {

			const fReader = new FileReader();
			fReader.onload = function (event) {
				const base64String = event.target.result.split(",")[1]; // Get Base64 part of the string
				callback(base64String);
			};
			fReader.onerror = function (error) {
				MessageBox.error(this.oBundle.getText("traffic_MessageBoxForReadingFile") + file.name);
			};
			fReader.readAsDataURL(file); // Read file as Data URL
		},

		/**
		* Functon for Close Camera Dialog
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onCloseCameraDialog
		* @author MM
		*/

		onCloseCameraDialog: function () {
			if (this._cameraDialog) {
				this._cameraDialog.close();
			}
			if (this._cameraStream) {
				this._cameraStream.getTracks().forEach(track => track.stop());
				this._cameraStream = null;
			}
		},

		/**
	   * Functon for Switch Camera Back or Front
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
	   * @version 1.0.0
	   * @since 10.02.2025
	   * @fires onSwitchCamera,restartCameraStream
	   * @author MM
	   */

		onSwitchCamera: function () {
			sFacingMode = sFacingMode === "environment" ? "user" : "environment";
			this.restartCameraStream();
		},

		/**
		* Functon for Save Attachment API 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressSaveRepresAttachment
		* @author MM
		*/

		onBtnPressSaveRepresAttachment: async function () {
			let oFileUploadModel = this.getView().getModel("FileUploadedModel").getData();
			let oFiles = []; // Final array to collect all files

			// Loop over each FileCategory
			oFileUploadModel.FileCategory.forEach((oCategory) => {
				// Check if Files exist inside category
				if (oCategory.Files) {
					if (oCategory.Files.base64File != null) {
						oFiles.push({
							attachmentGuId: null,
							attachmentName: oCategory.Files.attachmentName,
							orgFileName: oCategory.Files.orgFileName,
							orgFileExtension: oCategory.Files.orgFileExtension,
							docType: null,
							docId: null,
							docGuid: null,
							base64File: oCategory.Files.base64File
						});
					} else {
						oCategory.Files = [];
					}

				}
			});

			let oPayload = {
				Files: oFiles
			};

			await this.createNewModelUsingAPI(
				Constant.POST,
				'/uploadAttachment',
				oPayload,
				'RespoAttachmentModel'
			);
			const oResponse = this.getApiResponseObject();
			if (oResponse?.success) {
				oFiles = [];
				let oModel = this.getView().getModel('RespoAttachmentModel');
				let oData = oModel.getData();
				let lAttachmentData = oData.results;
				return lAttachmentData;
			} else {
				let oRes = JSON.parse(oResponse.object.responseText);
				MessageBox.error(oRes.error?.message?.value);
				return;
			}

		},

		/**
		* Functon for Patch Attachment API 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 10.02.2025
		* @fires patchAttachmentDataRepres
		* @author MM
		*/

		patchAttachmentDataRepres: async function () {

			let oSaveResModel = this.getView().getModel("GetSalesOrderResponse");
			let oRepresResModel = this.getView().getModel('RespoAttachmentModel');
			let oRepresResData = oRepresResModel.getData().results; // Attachments
			let oSaveResData = oSaveResModel.getData();               // Save data (for GUID)
			let svehicleOrderInspectionUUID = oSaveResData.vehicleOrderInspectionUUID; // Your docGuid

			if (!svehicleOrderInspectionUUID) {
				MessageBox.error(this.oBundle.getText("traffic_MessageBoxForGuidNotFound"));
				return;
			}

			let aFilesPayload = [];

			// Prepare required payload
			oRepresResData.forEach((oAttachment) => {
				aFilesPayload.push({
					attachmentGuId: oAttachment.attachmentGuId,
					docGuid: svehicleOrderInspectionUUID
				});
			});

			let oPayload = {
				Files: aFilesPayload
			};
			await this.createNewModelUsingAPI(Constant.POST, '/updateAttachmentDocGuid', oPayload, 'PatchResponseModel');
			let oAttachmentPatchModel = this.getView().getModel('PatchResponseModel');
			let oData = oAttachmentPatchModel.getData();

		},

		/**
		* Functon for Patch Attachment API 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onViewFileRepres
		* @author MM
		*/


		onViewFileRepres: async function () {
			let oFileUploadData = this.getView().getModel("FileUploadedModel").getData().FileCategory[0].Files;
			this.displayAttachment(oFileUploadData);
		},

		/**
		* Functon for View File Dialog
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 10.02.2025
		* @fires displayAttachment
		* @author MM
		*/

		displayAttachment: function (attachmentData) {
			if (!attachmentData.base64File || !attachmentData.base64File) {
				MessageToast.show(this.oBundle.getText("traffic_MessageBoxForInvalidAttachment"));
				return;
			}

			let sBase64 = attachmentData.base64File;
			let sFileType = attachmentData.orgFileExtension;

			let byteCharacters = atob(sBase64);
			let byteNumbers = Array.from(byteCharacters, char => char.charCodeAt(0));
			let byteArray = new Uint8Array(byteNumbers);
			let blob = new Blob([byteArray], { type: 'application/pdf' });
			let sBlobUrl = URL.createObjectURL(blob);

			if (sFileType === "pdf") {
				var oPDFViewer = new PDFViewer();
				this.getView().addDependent(oPDFViewer);
				oPDFViewer.setSource(sBlobUrl);
				oPDFViewer.open();
			}
			else if (["png", "jpg", "jpeg", "avif"].includes(sFileType.toLowerCase())) {
				const oDialog = new Dialog({
					title: this.oBundle.getText("payment_ViewAttach"),
					content: new Image({
						src: sBlobUrl,
						width: "100%",
						height: "100%"
					}),
					endButton: new Button({
						text: "Close",
						press: function () {
							oDialog.close(); // Use the dialog instance directly
						}
					})
				});

				// Open the dialog
				oDialog.open();
			}
			else {
				MessageToast.show(this.oBundle.getText("traffic_MessageBoxForUnSupported"));
			}
		},

		/**
		* Function triggered to Cancel order as Set Status with CANCEL.
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentIntegration
		* @version 1.0.0
		* @since 06.05.2025
		* @fires _updateOrderStatusForCancel
		* @author MM
		*/
		_updateOrderStatusForCancel: async function () {
			let oSalesOrderResponse = this.getView().getModel("GetSalesOrderResponse");
			let SO_Number = oSalesOrderResponse.getProperty("/serviceRequestNo");
			let SO_UUID = oSalesOrderResponse.getProperty("/vehicleOrderInspectionUUID");


			let payload = {
				"orderStatus": Constant.Order_CANCEL,  // 'C' -- Cancel Order
				"serviceRequestNo": SO_Number,
			};

			await this.saveEntryForm(
				Constant.PATCH,
				"/VehicleOrderInspections(" + SO_UUID + ")",
				payload
			);

			const oResponse = this.getApiResponseObject();
			if (oResponse?.success) {
				let oRes = oResponse
			} else {
				let oRes = JSON.parse(oResponse.object.responseText);
				MessageBox.error(oRes.error?.message?.value);
				return;
			}
		},

	});

});