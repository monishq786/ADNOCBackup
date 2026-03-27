/**
* PaymentDetails Controller (V1.0).
* This controll refer to display paymenmt details and retry payment option & Print invoice.
* @author MM
* @date 10.10.2025
*/
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/UIComponent",
	"sap/ui/core/BusyIndicator",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	'adnoc/vi/vehicleinspection/modone/formatter/Formatter',
	'adnoc/vi/vehicleinspection/modone/constants/PaymentConstant',
	'adnoc/vi/vehicleinspection/modone/constants/Constant',
], function (Controller, Filter, FilterOperator, UIComponent, BusyIndicator, MessageToast, MessageBox, Formatter, PaymentConstant,Constant) {
	"use strict";

	return Controller.extend("adnoc.vi.vehicleinspection.modone.controller.PaymentDetails", {

		/**
         * Function using for to Load Page
         * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
         * @version 1.0.0
         * @since 10.11.2025
         * @fires onInit
         * @author MM
         */

		onInit: function () {
			this._oRouter = UIComponent.getRouterFor(this);
			this._oRouter.attachRouteMatched(this._handleRouteMatched, this);
		},

		/**
         * Function using for to Load Page
         * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
         * @version 1.0.0
         * @since 10.11.2025
         * @fires onAfterRendering
         * @author MM
         */

		onAfterRendering: function () {
			this.oBundle = this.getView().getModel("i18n").getResourceBundle();
			this._getMopData();
		},

		/**
         * Route Matched based on Routing Name
         * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
         * @version 1.0.0
         * @since 10.11.2025
         * @fires _handleRouteMatched
         * @author MM
         */


		_handleRouteMatched: function (oEvent) {

			if (oEvent.getParameter("name") === PaymentConstant.PaymentDetails) {

				this._ModelInitialLoad();
				var globalModel = this.getView().getModel("oGlobalModel").getData();

				// ****** Fab responce handling ****** //
				var oStartupParameters = this.getOwnerComponent().getComponentData().startupParameters;
				if (oStartupParameters && oStartupParameters.message) {

					var base64string = oStartupParameters.message[0];
					var decodedstring = atob(base64string);
					var parsedstring = JSON.parse(decodedstring);
					// Storing the payment reponce value to GlobalModel 
					var Order = parsedstring.ADNOC_INVOICE.slice(-10);
					globalModel.Object = parsedstring;
					globalModel.Saleorder = Order;
					globalModel.Authcode = parsedstring.APPROVAL_CODE;
					globalModel.TransactionMessage = parsedstring.RESPONSE_MSG;
					globalModel.Cardno = parsedstring.CARD_NUMBER;
					globalModel.Cardname = parsedstring.CARD_NAME;
					globalModel.Cardamount = parsedstring.AMOUNT;
					globalModel.AdnocInvoice = parsedstring.ADNOC_INVOICE;
					globalModel.RRN = parsedstring.RRN;
					this.getView().getModel("oGlobalModel").setProperty("/Saleorder", Order);

					if (globalModel.Saleorder) {
						var SO = globalModel.Saleorder
						this._ongetSOdetails(SO);
					}

				} else {
					if (globalModel.Saleorder) {
						var SO = globalModel.Saleorder
						this._ongetSOdetails(SO);

					}
				}
			}
		},


		/**
		  * Function called from onAfterRendering Event to get the initial Model Loading.
		  * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		  * @version 1.0.0
		  * @since 06.11.2024
		  * @fires getFleetType, _getWashCount
		  * @author MM
		  */
		_ModelInitialLoad: function () {
			var oViewModel = this.getView().getModel("PaymentViewModel");
			var sJsonPath = sap.ui.require.toUrl("adnoc/vi/vehicleinspection/modone/model/PaymentViewModel.json");
			// Using jQuery.ajax to load the file
			jQuery.ajax({
				url: sJsonPath,
				dataType: "json",
				success: function (data) {
					oViewModel.setData(data); // Set the data manually
					oViewModel.refresh();
				}.bind(this),
				error: function (jqXHR, textStatus, errorThrown) {
					// No action
				}.bind(this)
			});

		},

		/**
		* Function used to read the order details.
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		* @version 1.0.0
		* @since 09.03.2025
		* @author MM
		* @fires _getPaymentDetails
		*/
		_ongetSOdetails: function (SO) {

			BusyIndicator.show(0);
			this.getView().getModel("VehicleinspectionService").read("/VehicleOrderInspections", {
				filters: [
					new Filter("orderNumber", FilterOperator.EQ, SO)
				],
				urlParameters: {
					$expand: "VehOrdInspDetails,VehOrdInspDetails/vehOrdInspLines"
				},
				success: function (oData, oResponse) {
					BusyIndicator.hide();
					if (oData.results.length !== PaymentConstant.ArrayZeroLength) {
						var itemsarr = oData.results[0].VehOrdInspDetails;
						var oGlobalModelRes = this.getView().getModel("oGlobalModel");
						oGlobalModelRes.setProperty("/SoItems", oData.results[0].VehOrdInspDetails.results[0].vehOrdInspLines);
						oGlobalModelRes.setProperty("/PlateNo", oData.results[0].VehOrdInspDetails.results[0].plateNumber);
						oGlobalModelRes.setProperty("/SONumber", oData.results[0].serviceRequestNo);
						oGlobalModelRes.setProperty("/SO_UUID", oData.results[0].vehicleOrderInspectionUUID);
						oGlobalModelRes.setProperty("/SO_Total", oData.results[0].orderTotal);
						oGlobalModelRes.setProperty("/UTRN", oData.results[0].orderUTRRefNo);
						oGlobalModelRes.setProperty("/MainPlant", oData.results[0].plantCode);
						oGlobalModelRes.setProperty("/MainPlantDesc", oData.results[0].plantName);
						oGlobalModelRes.setProperty("/SalesorderTotal", oData.results[0].orderTotal);
						oGlobalModelRes.setProperty("/SalesdiscountTotal", oData.results[0].discountValue);


						if (oData.results[0].plantCode) {
							this.getSiteNumber(oData.results[0].plantCode);
						}
						if (oData.results[0].VehOrdInspDetails.results[0].plateNumber) {
							this.getVehicleDetails(oData.results[0].VehOrdInspDetails.results[0].plateNumber);
						}
						var txnmsg = oGlobalModelRes.getProperty("/TransactionMessage");
						var oPaymentViewModel = this.getView().getModel("PaymentViewModel")
						if (txnmsg.match("APPROVAL") !== null) {
							oPaymentViewModel.setProperty("/SuccessStatus", true);
							oPaymentViewModel.setProperty("/FailedStatus", false);
							oPaymentViewModel.setProperty("/PayByOtherMOPButtonVisible", false);
							oPaymentViewModel.setProperty("/RetryButtonVisible", false);
						} else {
							oPaymentViewModel.setProperty("/PayByOtherMOPButtonVisible", true);
							oPaymentViewModel.setProperty("/RetryButtonVisible", true);
							oPaymentViewModel.setProperty("/SuccessStatus", false);
							oPaymentViewModel.setProperty("/FailedStatus", true);
						}
						this._getPaymentDetails(SO);
					}
				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					MessageBox.error(oError.message);
				}.bind(this)
			});
		},

		getVehicleDetails: function (fleetNumber) {
			this.getView().getModel("VehicleinspectionService").read("/VehicleMasters", {
				filters: [
					new Filter("fleetNumber", FilterOperator.EQ, fleetNumber)
				],
				success: function (oData, oResponse) {
					if (oData.results.length !== PaymentConstant.ArrayZeroLength) {
						var oGlobalModelRes = this.getView().getModel("oGlobalModel");
						oGlobalModelRes.setProperty("/PlateNo", oData.results[0].plateNo);
						oGlobalModelRes.setProperty("/PlateCode", oData.results[0].plateCode);
						oGlobalModelRes.setProperty("/Source", oData.results[0].plateSource);
					}

				}.bind(this),
				error: function (oError) {
					MessageBox.error(oError.message);
				}.bind(this)
			});
		},

		/**
		 * Function used to read the payment details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 09.03.2025
		 * @author MM
		 * @fires _saveDetails
		 */
		_getPaymentDetails: function (SO) {
			var vAuthcode = this.getView().getModel("oGlobalModel").getProperty("/Authcode");
			var CARD = PaymentConstant.bankMopType;
			var oModel = this.getView().getModel("PaymentViewModel");
			BusyIndicator.show();
			this.getView().getModel("VehicleinspectionService").read("/PaymentSet", {
				filters: [
					new Filter("orderNumber", FilterOperator.EQ, SO)
				],
				urlParameters: {
					$expand: "items"
				},
				success: function (oData, oResponse) {
					BusyIndicator.hide();
					if (oData.results.length !== PaymentConstant.ArrayZeroLength) {
						var obj = "";

						var aMOPItems = [];
						for (var i = 0; i < oData.results.length; i++) {
							aMOPItems = aMOPItems.concat(oData.results[i].items.results);
						}

						// var aMOPItems = oData.results[0].items.results;
						this.getView().getModel("oGlobalModel").setProperty("/MOPItems", aMOPItems);

						var paidamt = PaymentConstant.ArrayZeroLength;
						aMOPItems.forEach(item => {
							if (item.mopCode === CARD && item.status === PaymentConstant.CardPaymentNull) {
								item.approvalCode = vAuthcode;
								obj = item;
								// oModel.setProperty("/CardAmount", item.amount);
								this.getView().getModel("oGlobalModel").setProperty("/CardAmount", item.amount);
								// display the amount balance to pay 26-06-2025
							}
							if ((item.mopCode === CARD && item.approvalCode) || (item.mopCode !== CARD)) {
								// get the mop amount with satatus 'S' 26-06-2025
								// if (item.status === PaymentConstant.SuccessStatus) {
								paidamt = paidamt + parseFloat(item.amount);
							}

						});

						this.getView().getModel("PaymentViewModel").setProperty("/PaidAmount", parseFloat(paidamt).toFixed(2));
						var soamount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");
						var balance = parseFloat(soamount) - parseFloat(paidamt);
						this.getView().getModel("PaymentViewModel").setProperty("/BalancetoPay", parseFloat(balance).toFixed(2));

						if (obj) {
							this._saveDetails(obj, SO);
						}
					}

				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					MessageBox.error(oError.message);
				}.bind(this)
			});

		},

		/**
		 * Function used to save the MOP details to the payment table.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MM
		 */
		_saveDetails: function (payload, SO) {

			var globalModel = this.getView().getModel("oGlobalModel").getData();
			var paymentstatus = "";
			var scardmop = PaymentConstant.bankMopType;
			var txnmsg = this.getView().getModel("oGlobalModel").getProperty("/TransactionMessage");
			if (txnmsg.match("APPROVAL") === null && payload.mopCode === scardmop) {
				paymentstatus = PaymentConstant.FailedStatus; //Fail
			} else {
				paymentstatus = PaymentConstant.SuccessStatus; //Success
			}


			if (globalModel.Object.TXN_TYPE === PaymentConstant.saleTXNType) {
				var obj = {
					"id": payload.id,
					"paymentItem": payload.paymentItem,
					"amount": payload.amount,
					"mop": payload.mop,
					"actionCode": String(globalModel.Object.ACTION_CODE),
					"txnType": String(globalModel.Object.TXN_TYPE),
					"respCode": String(globalModel.Object.RESP_CODE),
					"responseMsg": String(globalModel.Object.RESPONSE_MSG),
					"batch": String(globalModel.Object.BATCH),
					"tid": String(globalModel.Object.TID),
					"mid": String(globalModel.Object.MID),
					"acnocInvoice": String(globalModel.Object.ADNOC_INVOICE),
					"posInvoice": String(globalModel.Object.POS_INVOICE),
					"cardNumber": String(globalModel.Object.CARD_NUMBER),
					"cardholderName": String(globalModel.Object.CARDHOLDER_NAME),
					"cardName": String(globalModel.Object.CARD_NAME),
					"approvalCode": String(globalModel.Object.APPROVAL_CODE),
					"txnDateTime": String(globalModel.Object.TXN_DATE_TIME),
					"emvLabel": String(globalModel.Object.EMV_LABEL),
					"emvAc": String(globalModel.Object.EMV_AC),
					"rrn": String(globalModel.Object.RRN),
					"entryMode": String(globalModel.Object.ENTRY_MODE),
					"signRequired": String(globalModel.Object.SIGN_REQUIRED),
					"emvAid": String(globalModel.Object.EMV_AID),
					"emvTsr": String(globalModel.Object.EMV_TVR),
					"emvTsi": String(globalModel.Object.EMV_TSI),
					"cardSeqNum": String(globalModel.Object.CARD_SEQ_NUM),
					"voidFlag": String(globalModel.Object.VOID_FALG),
					"chCurr": String(globalModel.Object.CH_CURR),
					"chCurrExp": String(globalModel.Object.CH_CURR_EXP),
					"chExchRate": String(globalModel.Object.CH_EXCH_RATE),
					"chMarkup": String(globalModel.Object.CH_MARKUP),
					"mun": String(globalModel.Object.MUN),
					"status": sPaymentstatus
				};
			} else if (globalModel.Object.TXN_TYPE === PaymentConstant.AaniPayTxnType) {
				var obj = {
					"id": payload.id,
					"paymentItem": payload.paymentItem,
					"amount": payload.amount,
					"mop": payload.mop,
					"approvalCode": payload.approvalCode,
					"actionCode": String(globalModel.Object.ACTION_CODE),
					"txnType": String(globalModel.Object.TXN_TYPE),
					"respCode": String(globalModel.Object.RESP_CODE),
					"responseMsg": String(globalModel.Object.RESPONSE_MSG),
					"batch": String(globalModel.Object.BATCH),
					"tid": String(globalModel.Object.TID),
					"mid": String(globalModel.Object.MID),
					"acnocInvoice": String(globalModel.Object.ADNOC_INVOICE),
					"posInvoice": String(globalModel.Object.POS_INVOICE),
					"cardNumber": String(globalModel.Object.CARD_NUMBER),
					"txnDateTime": String(globalModel.Object.TXN_DATE_TIME),
					"rrn": String(globalModel.Object.RRN),
					"voidFlag": String(globalModel.Object.VOID_FALG),
					"status": sPaymentstatus
				};
			}


			BusyIndicator.show();
			var oModel = this.getView().getModel("VehicleinspectionService");
			var path = "";
			path = oModel.createKey("/PaymentItemSet", {
				id: payload.id,
				paymentItem: payload.paymentItem
			});

			oModel.sDefaultUpdateMethod = sap.ui.model.odata.UpdateMethod.Merge;
			oModel.update(path, obj, {
				success: function (oData, oResponse) {
					BusyIndicator.hide();
					var oPaymentViewModel = this.getView().getModel("PaymentViewModel")
					if (txnmsg.match("APPROVAL") !== null) {
						this._updateOrderstatus(SO);
						oPaymentViewModel.setProperty("/SuccessStatus", true);
						oPaymentViewModel.setProperty("/FailedStatus", false);
						oPaymentViewModel.setProperty("/PayByOtherMOPButtonVisible", false);
						oPaymentViewModel.setProperty("/RetryButtonVisible", false);
					} else {
						oPaymentViewModel.setProperty("/PayByOtherMOPButtonVisible", true);
						oPaymentViewModel.setProperty("/RetryButtonVisible", true);
						oPaymentViewModel.setProperty("/SuccessStatus", false);
						oPaymentViewModel.setProperty("/FailedStatus", true);
					}
					// Read the MOP item after saving the payment details added on 21-07-25
					this._getUpdatedPaymentDetails(SO);

				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					MessageBox.error(oError.message);
				}.bind(this)
			});
		},

		/**
		 * Function triggered to update order status as complted with 'P'.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires _ModelInitialLoad, _ClearGlobalModel
		 * @author MM
		 */
		_updateOrderstatus: function (SO) {
            var oGlobalModelRes = this.getView().getModel("oGlobalModel")
			var oModel = this.getView().getModel("PaymentViewModel").getData();

			var cartitemsarr = oGlobalModelRes.getProperty("/SoItems");
			var Plant = oGlobalModelRes.getProperty("/MainPlant");

			var SO_Number = SO;
			var SO_UUID = oGlobalModelRes.getProperty("/SO_UUID");

			var itemsarr = [];
			let item = 10;
			cartitemsarr.forEach(cartItem => {
				const itemString = item.toString();
				const obj = {
					"itemNum": itemString,
					"material": String(cartItem.Material),
					"materialDesc": cartItem.ServiceName,
					"quantity": cartItem.Quantity,
					"uom": cartItem.UoM,
					"netPrice": parseFloat(cartItem.NetPrice),
					"taxPrice": parseFloat(cartItem.TaxPrice),
					"totalPrice": parseFloat(cartItem.TotalAmount),
					"currency": PaymentConstant.Currency,
					"unitPrice": parseFloat(cartItem.UnitNetPrice),
					"unitTaxPrice": parseFloat(cartItem.UnitTaxPrice),
					"plant": Plant
				};

				item = item + 10;
				itemsarr.push(obj);
			});

			var payload = {
				"orderStatus": PaymentConstant.StatusPayment, // P -- Payment Done 
				"orderNumber": SO_Number,
				// "items": itemsarr
			};
			BusyIndicator.show();

			var odataModel = this.getView().getModel("VehicleinspectionService");
			var path = "";
			path = odataModel.createKey("/VehicleOrderInspections", {
				vehicleOrderInspectionUUID: SO_UUID
			});

			oModel.sDefaultUpdateMethod = sap.ui.model.odata.UpdateMethod.Merge;

			this.getView().getModel("VehicleinspectionService").update(path, payload, {
				success: function (oData, oResponse) {
					BusyIndicator.hide();
					// Read the MOP item after saving the payment details added on 21-07-25
					this._getUpdatedPaymentDetails(SO_Number);

				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					MessageBox.error(oError.message);
				}.bind(this)
			});
		},
		onPressPayOtherMop: function () {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			PaymentViewModel.setProperty("/IconTabPayOtherMop", true);
			PaymentViewModel.setProperty("/IconTabSeletedKey", "Payment");
			PaymentViewModel.setProperty("/PayByOtherMOPButtonVisible", false);

		},
		// Payment Option
		/**
		 * Function triggered when cash mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 10.03.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressCashSelect: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var Seleted = oEvent.getSource().getSelected();
			if (Seleted) {
				PaymentViewModel.setProperty("/CashMOPPanelExpand", true);

				var walletamount = PaymentViewModel.getProperty("/WalletAmount");
				var cardamount = PaymentViewModel.getProperty("/CardAmount");
				var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
				var couponamount = PaymentViewModel.getProperty("/CouponAmount");
				var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
				var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");
				var Total = parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletamount);
				var Balance = PaymentConstant.ArrayZeroLength;
				if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
					Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
				}
				Balance = Balance - parseFloat(Total);
				Balance = parseFloat(Balance);

				PaymentViewModel.setProperty("/Cashamount", parseFloat(Balance).toFixed(2));

			} else {
				PaymentViewModel.setProperty("/CashMOPPanelExpand", false);
				// reset amount 
				PaymentViewModel.setProperty("/Cashamount", PaymentConstant.initialiseZero);
			}
			PaymentViewModel.refresh();
		},


		/**
		 * Function triggered when cash mop panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 10.08.2025
		 * @fires -, 
		 * @author MM
		 */
		onExpandCash: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var expan = oEvent.getSource().getExpanded();
			var globalmodel = this.getView().getModel("oGlobalModel").getData();
			var b2btype = PaymentConstant.P24Postpaid;
			if (globalmodel.CustomerTypeCode && globalmodel.CustomerTypeCode.match(b2btype) !== null) {
				MessageToast.show(this.oBundle.getText("msgPayment24B2B"));
				PaymentViewModel.setProperty("/Cashamount", PaymentConstant.initialiseZero);

			} else {
				if (expan) {
					PaymentViewModel.setProperty("/Cash_CheckBoxSeleted", true);
					var walletamount = PaymentViewModel.getProperty("/WalletAmount");
					var cardamount = PaymentViewModel.getProperty("/CardAmount");
					var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
					var couponamount = PaymentViewModel.getProperty("/CouponAmount");
					var aanipayamount = PaymentViewModel.getProperty("/AaniPayAmount");
					var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
					var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");

					if (!walletamount) {
						walletamount = "0";
					}
					if (!cardamount) {
						cardamount = "0";
					}
					if (!loyaltyamount) {
						loyaltyamount = "0";
					}
					if (!couponamount) {
						couponamount = "0";
					}
					if (!aanipayamount) {
						aanipayamount = "0";
					}

					var Total = parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletamount) + parseFloat(aanipayamount);
					var Balance = PaymentConstant.ArrayZeroLength;
					if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
						Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
						Balance = Balance - parseFloat(Total);
						Balance = parseFloat(Balance);
					} else {
						Balance = parseFloat(soAmount) - parseFloat(Total);
					}
					PaymentViewModel.setProperty("/Cashamount", parseFloat(Balance).toFixed(2));
				} else {
					PaymentViewModel.setProperty("/Cash_CheckBoxSeleted", false);
					// reset amount 
					PaymentViewModel.setProperty("/Cashamount", PaymentConstant.initialiseZero);
				}
			}
		},
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

			var oModel = this.getView().getModel("PaymentViewModel").getData();
			var cashamt = oModel.Cashamount;
			var cardamt = oModel.CardAmount;
			var Lamt = oModel.Loyaltyamount;
			var couponamt = oModel.CouponAmount;
			var walletAmount = oModel.WalletAmount;
			var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");
			var paidAmount = oModel.PaidAmount;
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
			var moptotal = parseFloat(cashamt) + parseFloat(cardamt) + parseFloat(couponamt) + parseFloat(Lamt) + parseFloat(walletAmount) + parseFloat(aanipayAmount) + parseFloat(paidAmount);
			var soamt = soAmount;
			if (parseFloat(moptotal) > parseFloat(soamt)) {
				MessageToast.show(this.oBundle.getText("msgMOPAMountError"));
				oEvent.getSource().setValue("");
			} else {
				// do nothing
			}
		},

		/**
		 * Function triggered while changing cash mop amount input.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
		 * @author MM
		 */
		onChangeCashMop: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = parseFloat(oValue).toFixed(2);
			var cardamount = PaymentViewModel.getProperty("/CardAmount");
			var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
			var couponamount = PaymentViewModel.getProperty("/CouponAmount");
			var amount = this.getView().getModel("oGlobalModel").getProperty("/Cardamount");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
			if (Total > amount) {

				MessageToast.show(this.oBundle.getText("payment_messageToastGreaterThanOrderAmount") + " " + amount);
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				PaymentViewModel.setProperty("/Cashamount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered when card mop panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onExpandCard: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var expan = oEvent.getSource().getExpanded();
			var globalmodel = this.getView().getModel("oGlobalModel").getData();
			var b2btype = PaymentConstant.P24Postpaid;
			if (globalmodel.CustomerTypeCode && globalmodel.CustomerTypeCode.match(b2btype) !== null) {
				MessageToast.show(this.oBundle.getText("msgPayment24B2B"));
				PaymentViewModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);
			} else {
				if (expan) {
					PaymentViewModel.setProperty("/Card_CheckBoxSeleted", true);
					var walletamount = PaymentViewModel.getProperty("/WalletAmount");
					var cashamount = PaymentViewModel.getProperty("/Cashamount");
					var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
					var couponamount = PaymentViewModel.getProperty("/CouponAmount");
					var aanipayamount = PaymentViewModel.getProperty("/AaniPayAmount");
					var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
					var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");
					if (!walletamount) {
						walletamount = "0";
					}
					if (!cashamount) {
						cashamount = "0";
					}
					if (!loyaltyamount) {
						loyaltyamount = "0";
					}
					if (!couponamount) {
						couponamount = "0";
					}
					if (!aanipayamount) {
						aanipayamount = "0";
					}
					var Total = parseFloat(cashamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletamount) + parseFloat(aanipayamount);
					var Balance = PaymentConstant.ArrayZeroLength;
					if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
						Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
						Balance = Balance - parseFloat(Total);
						Balance = parseFloat(Balance);
					} else {
						Balance = parseFloat(soAmount) - parseFloat(Total);
					}
					PaymentViewModel.setProperty("/CardAmount", parseFloat(Balance).toFixed(2));
					this.getView().getModel("oGlobalModel").setProperty("/CardAmount", parseFloat(Balance).toFixed(2));
				} else {
					PaymentViewModel.setProperty("/Card_CheckBoxSeleted", false);
					//Reset amount
					PaymentViewModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);
				}
			}
		},


		onExpandAaniPay: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var expan = oEvent.getSource().getExpanded();
			var globalmodel = this.getView().getModel("oGlobalModel").getData();
			var b2btype = PaymentConstant.P24Postpaid;
			if (globalmodel.CustomerTypeCode && globalmodel.CustomerTypeCode.match(b2btype) !== null) {
				MessageToast.show(this.oBundle.getText("msgPayment24B2B"));
				PaymentViewModel.setProperty("/AaniPayAmount", PaymentConstant.initialiseZero);
			} else {
				if (expan) {
					PaymentViewModel.setProperty("/Aanipay_CheckBoxSeleted", true);

					var cashamount = PaymentViewModel.getProperty("/Cashamount");
					var cardamount = PaymentViewModel.getProperty("/CardAmount");
					var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
					var couponamount = PaymentViewModel.getProperty("/CouponAmount");
					var walletamount = PaymentViewModel.getProperty("/WalletAmount");
					var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
					var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");
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
					if (walletamount === "") {
						walletamount = PaymentConstant.initialiseZero;
					}

					var Total = parseFloat(cashamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletamount) + parseFloat(cardamount);
					var Balance = PaymentConstant.ArrayZeroLength;
					if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
						Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
						Balance = Balance - parseFloat(Total);
						Balance = parseFloat(Balance);
					} else {
						Balance = parseFloat(soAmount) - parseFloat(Total);
					}
					PaymentViewModel.setProperty("/AaniPayAmount", parseFloat(Balance).toFixed(2));

				} else {
					PaymentViewModel.setProperty("/Aanipay_CheckBoxSeleted", false);
					//Reset amount
					PaymentViewModel.setProperty("/AaniPayAmount", PaymentConstant.initialiseZero);
				}
			}
		},



		/**
		 * Function triggered when Card mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressCardSelect: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var Seleted = oEvent.getSource().getSelected();
			if (Seleted) {
				PaymentViewModel.setProperty("/CardMOPPanelExpand", true);
				var walletamount = PaymentViewModel.getProperty("/WalletAmount");
				var cashamount = PaymentViewModel.getProperty("/Cashamount");
				var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
				var couponamount = PaymentViewModel.getProperty("/CouponAmount");
				var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
				var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");
				var Total = parseFloat(cashamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletamount);
				var Balance = PaymentConstant.ArrayZeroLength;
				if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
					Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
				}
				Balance = Balance - parseFloat(Total);
				Balance = parseFloat(Balance);

				PaymentViewModel.setProperty("/CardAmount", parseFloat(Balance).toFixed(2));

			} else {
				PaymentViewModel.setProperty("/CardMOPPanelExpand", false);
				// reset amount 
				PaymentViewModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);
			}
			PaymentViewModel.refresh();

		},

		/**
		 * Function triggered while changing card mop amount input.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
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
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
		 * @author MM
		 */
		onChangeCardMop: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = PaymentViewModel.getProperty("/Cashamount");
			var cardamount = parseFloat(oValue).toFixed(2);
			var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
			var couponamount = PaymentViewModel.getProperty("/CouponAmount");

			var amount = this.getView().getModel("oGlobalModel").getProperty("/Cardamount");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
			if (Total > amount) {
				MessageToast.show(this.oBundle.getText("payment_messageToastGreaterThanOrderAmount") + " " + amount);
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				PaymentViewModel.setProperty("/CardAmount", PaymentConstant.initialiseZero);
			}
		},



		/**
		 * Function triggered check the loyalty card details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressCheckCard: function (oEvent) {
			this.source = oEvent.getSource();
			if (!this.RewardCheckFrag) {
				this.RewardCheckFrag = sap.ui.xmlfragment("adnoc.btp.cw.fragment.RewardCheck", this);
				this.getView().addDependent(this.RewardCheckFrag);
			}
			this.RewardCheckFrag.open();
			this.getView().getModel("oGlobalModel").setProperty("/Loyalty_ScanedIDInp", "");
			this.getView().getModel("oGlobalModel").setProperty("/Loyalty_ScanedIDManualInp", "");

			// added on 11-07-2025
			this.RewardCheckFrag.attachAfterOpen(() => {
				setTimeout(() => {
					// Get all content inside the dialog/fragment
					let aControls = this.RewardCheckFrag.findAggregatedObjects(true, (control) => {
						return control.isA("sap.m.Input"); // Find all Input fields
					});

					if (aControls.length > 0) {
						aControls[0].focus(); // Focus the first Input field
					}
				}, 200);
			});

			this.onReadKey();

		},
		/**
		 * Function triggered to close loyalty fragment.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressCloseCheckCard: function () {
			this.RewardCheckFrag.close();

		},

		/**
		 * Function triggered when loyalty scan got success.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires _clearMOP 
		 * @author MM
		 */
		onScanSuccess: function (oEvent) {
			if (oEvent.getParameter("cancelled")) {
				MessageToast.show(this.oBundle.getText("home_messageToastScanCancelled"), {
					duration: 1000
				});
			} else {
				if (oEvent.getParameter("text")) {
					this.getView().getModel("PaymentViewModel").setProperty("/Loyalty_ScanedID", oEvent.getParameter("text"));
				}
			}
		},


		/**
		 * Function triggered when loyalty scan got error.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires _clearMOP 
		 * @author MM
		 */
		onScanError: function (oEvent) {
			MessageToast.show(this.oBundle.getText("commom_ScanFailed") + oEvent, {
				duration: 1000
			});
		},


		/**
		 * Function triggered when loyalty ndc live input change.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires _clearMOP 
		 * @author MM
		 */
		onScanLiveupdate: function (oEvent) {
			// User can implement the validation about inputting value
		},

		/**
		 * Function triggered to check loyalty.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires fetchloyaltyDetails
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
		 * Event to triggered to fetch the loyalty details .
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.Home.
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MM
		 * @fires -
		 */
		fetchloyaltyDetails: function (loyaltyid) {
			const oModel = this.getView().getModel("VehicleinspectionService");
			var oGlobalModel = this.getView().getModel("oGlobalModel");
			BusyIndicator.show(0);
			oModel.callFunction("/fetchLoyaltyDetails", {
				method: Constant.GET,
				urlParameters: { input: loyaltyid },
				success: function (oData) {
					BusyIndicator.hide();
					if (oData.fetchLoyaltyDetails.responseData) {
						MessageToast.show(this.oBundle.getText("home_messageToastPleaseRemoveCard"));  // Message text changes on 11-07-2025
						var balance = oData.fetchLoyaltyDetails.responseData.balance;
						var tierName = oData.fetchLoyaltyDetails.responseData.tierName;
						oGlobalModel.setProperty("/LoyaltyID", loyaltyid);
						oGlobalModel.setProperty("/LoyaltyBal", balance);
						oGlobalModel.setProperty("/LoyaltyTierName", tierName);
						oGlobalModel.setProperty("/Loyalty_ScanedIDInp", "");
						oGlobalModel.setProperty("/Loyalty_ScanedIDManualInp", "");
						this.RewardCheckFrag.close();
						// this._getPayment24CustDetails(loyaltyid);
						var LoyaltyIDMasked = loyaltyid.replace(loyaltyid.substring(3, loyaltyid.length - 2), "******");
						oGlobalModel.setProperty("/LoyaltyIDMasked", LoyaltyIDMasked);

						var emiratesToken = oGlobalModel.getProperty("/EmiratesTokenSerial");
						if (loyaltyid.match("EID") !== null && emiratesToken) {
							this._getPayment24CustDetails(emiratesToken);
						}
					}
				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					if (JSON.parse(oError.responseText)) {
						MessageBox.error(JSON.parse(oError.responseText).error.message.value);
					} else {
						MessageBox.error(oError.message);
					}
				}
			});
		},

		/**
		 * Event triggered to read Emirates Card Details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.Home.
		 * @version 1.0.0
		 * @since 15.02.2025
		 * @author MM
		 * @fires fetchloyaltyDetails
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

					MessageToast.show(this.oBundle.getText("home_messageToastErrorfetchingcarddata"));
				}
			});

		},

		/**
		 * Event to triggered to fetch the loyalty details .
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.Home.
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MM
		 * @fires -
		 */
		fetchloyaltyDetailsWithEIDCard: function (loyaltyid) {
			var oGlobalModel = this.getView().getModel("oGlobalModel");
			const oModel = this.getView().getModel("VehicleOrderInspections");
			BusyIndicator.show(0);
			oModel.callFunction("/fetchLoyaltyDetails", {
				method: Constant.GET,
				urlParameters: { input: loyaltyid },
				success: function (oData, response) {
					BusyIndicator.hide();
					if (oData.fetchLoyaltyDetails.responseData) {
						var balance = oData.fetchLoyaltyDetails.responseData.balance;
						var loyaltyCustomer = oData.fetchLoyaltyDetails.responseData.customerName;
						this.RewardCheckFrag.close();
						oGlobalModel.setProperty("/LoyaltyID", loyaltyid);
						oGlobalModel.setProperty("/LoyaltyBal", balance);
						oGlobalModel.setProperty("/LoyaltyCustName", loyaltyCustomer);
						oGlobalModel.setProperty("/Loyalty_ScanedIDInp", "");
						oGlobalModel.setProperty("/Loyalty_ScanedIDManualInp", "");
					}
					this._EIDCardStatus();
				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					MessageBox.error(oError.message);
				}
			});
		},
		/**
		 * Function triggered when card loyalty panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onExpandLoyalty: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var expan = oEvent.getSource().getExpanded();
			var LoyaltyID = this.getView().getModel("oGlobalModel").getProperty("/LoyaltyID");
			var globalmodel = this.getView().getModel("oGlobalModel").getData();
			var b2btype = PaymentConstant.P24Postpaid;
			if (globalmodel.CustomerTypeCode && globalmodel.CustomerTypeCode.match(b2btype) !== null) {
				MessageToast.show(this.oBundle.getText("msgPayment24B2B"));
				PaymentViewModel.setProperty("/Loyaltyamount", PaymentConstant.initialiseZero);
			} else {
				if (expan) {
					if (LoyaltyID) {
						PaymentViewModel.setProperty("/Loyalty_CheckBoxSeleted", true);
						var walletamount = PaymentViewModel.getProperty("/WalletAmount");
						var cashamount = PaymentViewModel.getProperty("/Cashamount");
						var cardamount = PaymentViewModel.getProperty("/CardAmount");
						var couponamount = PaymentViewModel.getProperty("/CouponAmount");
						var aanipayamount = PaymentViewModel.getProperty("/AaniPayAmount");
						var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
						var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");


						if (!walletamount) {
							walletamount = "0";
						}
						if (!cardamount) {
							cardamount = "0";
						}
						if (!cashamount) {
							cashamount = "0";
						}
						if (!couponamount) {
							couponamount = "0";
						}
						if (!aanipayamount) {
							aanipayamount = "0";
						}
						var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(couponamount) + parseFloat(walletamount) + parseFloat(aanipayamount);
						var Balance = PaymentConstant.ArrayZeroLength;
						if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
							Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
							Balance = Balance - parseFloat(Total);
							Balance = parseFloat(Balance);
						} else {
							Balance = parseFloat(soAmount) - parseFloat(Total);
						}
						PaymentViewModel.setProperty("/Loyaltyamount", parseFloat(Balance).toFixed(2));
					} else {
						MessageToast.show(this.oBundle.getText("home_messageToastScanLoyaltyId"));
						this.onPressCheckCard();
						// Below code comment and enabled above code
						// if (!this.RewardCheckFrag) {
						// 	this.RewardCheckFrag = sap.ui.xmlfragment("adnoc.btp.cw.fragment.RewardCheck", this); // Fragments for Process select
						// 	this.getView().addDependent(this.RewardCheckFrag);
						// }
						// this.RewardCheckFrag.open();
						// this.getView().getModel("oGlobalModel").setProperty("/Loyalty_ScanedIDInp", "");
						// this.getView().getModel("oGlobalModel").setProperty("/Loyalty_ScanedIDManualInp", "");
						// // added on 11-07-2025
						// this.RewardCheckFrag.attachAfterOpen(() => {
						// 	setTimeout(() => {
						// 		// Get all content inside the dialog/fragment
						// 		let aControls = this.RewardCheckFrag.findAggregatedObjects(true, (control) => {
						// 			return control.isA("sap.m.Input"); // Find all Input fields
						// 		});

						// 		if (aControls.length > 0) {
						// 			aControls[0].focus(); // Focus the first Input field
						// 		}
						// 	}, 100);
						// });

						// this.onReadKey();
						PaymentViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
					}
				} else {
					PaymentViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
					PaymentViewModel.setProperty("/Loyaltyamount", PaymentConstant.initialiseZero);
				}
			}
		},


		/**
	 * Function triggered when Loyalty mop select.
	 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
	 * @version 1.0.0
	 * @since 06.11.2024
	 * @fires -
	 * @author MM
	 */
		onPressLoyaltySelect: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var Seleted = oEvent.getSource().getSelected();
			var LoyaltyID = this.getView().getModel("oGlobalModel").getProperty("/LoyaltyID");
			if (Seleted) {
				if (LoyaltyID) {
					PaymentViewModel.setProperty("/LoyaltyMOPPanelExpand", true);
					var walletamount = PaymentViewModel.getProperty("/WalletAmount");
					var cashamount = PaymentViewModel.getProperty("/Cashamount");
					var cardamount = PaymentViewModel.getProperty("/CardAmount");
					var couponamount = PaymentViewModel.getProperty("/CouponAmount");
					var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
					var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");
					var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(couponamount) + parseFloat(walletamount);
					var Balance = PaymentConstant.ArrayZeroLength;
					if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
						Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
					}
					Balance = Balance - parseFloat(Total);
					Balance = parseFloat(Balance);
					PaymentViewModel.setProperty("/Loyaltyamount", parseFloat(Balance).toFixed(2));
				} else {
					MessageToast.show(this.oBundle.getText("home_messageToastScanLoyaltyId"));
					this.onPressCheckCard();

					// if (!this.RewardCheckFrag) {
					// 	this.RewardCheckFrag = sap.ui.xmlfragment("adnoc.btp.cw.fragment.RewardCheck", this); // Fragments for Process select
					// 	this.getView().addDependent(this.RewardCheckFrag);
					// }
					// this.RewardCheckFrag.open();
					// this.getView().getModel("oGlobalModel").setProperty("/Loyalty_ScanedIDInp", "");
					// this.getView().getModel("oGlobalModel").setProperty("/Loyalty_ScanedIDManualInp", "");
					// // added on 11-07-2025
					// this.RewardCheckFrag.attachAfterOpen(() => {
					// 	setTimeout(() => {
					// 		// Get all content inside the dialog/fragment
					// 		let aControls = this.RewardCheckFrag.findAggregatedObjects(true, (control) => {
					// 			return control.isA("sap.m.Input"); // Find all Input fields
					// 		});

					// 		if (aControls.length > 0) {
					// 			aControls[0].focus(); // Focus the first Input field
					// 		}
					// 	}, 100);
					// });

					PaymentViewModel.setProperty("/LoyaltyMOPPanelExpand", false);
				}

			} else {
				PaymentViewModel.setProperty("/Loyalty_CheckBoxSeleted", false);
				// reset amount 
				PaymentViewModel.setProperty("/Loyaltyamount", PaymentConstant.initialiseZero);
			}
			PaymentViewModel.refresh();
		},
		/**
		 * Function triggered while changing cash mop amount input.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
		 * @author MM
		 */
		onLiveChangeCashMop: function (oEvent) {

			let input = oEvent.getSource();
			let value = input.getValue();
			// Remove non-numeric and more than one dot
			value = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
			// Condition added to make only 2 decimal value
			var bNotnumber = isNaN(value);
			if (bNotnumber === false) {
				if (value.indexOf(".") !== -1) {
					var Result = (value.indexOf(".") >= 0) ? (value.substr(0, value.indexOf(".")) + value.substr(value.indexOf("."), 3)) : value;
					// oEvent.getSource().setValue(Result);
					input.setValue(Result);
				} else {
					// oEvent.getSource().setValue(value);
					input.setValue(value);
				}
			} else {
				var RemoveSpecialChar = value.substr(0, value.length - 1);
				// oEvent.getSource().setValue(RemoveSpecialChar);
				input.setValue(RemoveSpecialChar);
			}
			// input.setValue(value);
		},
		/**
		 * Function triggered while changing loyalty mop amount input.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
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
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
		 * @author MM
		 */
		onChangeLoyaltyMop: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = PaymentViewModel.getProperty("/Cashamount");
			var cardamount = PaymentViewModel.getProperty("/CardAmount");
			var loyaltyamount = parseFloat(oValue).toFixed(2);
			var couponamount = PaymentViewModel.getProperty("/CouponAmount");
			var amount = this.getView().getModel("oGlobalModel").getProperty("/Cardamount");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
			if (Total > amount) {
				MessageToast.show(this.oBundle.getText("payment_messageToastGreaterThanOrderAmount") + " " + amount);
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				PaymentViewModel.setProperty("/Loyaltyamount", PaymentConstant.initialiseZero);
			}
		},
		// Coupon MOP
		/**
		 * Function triggered when card Coupon panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onExpandCoupon: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var expan = oEvent.getSource().getExpanded();
			if (expan) {
				PaymentViewModel.setProperty("/Coupon_CheckBoxSeleted", true);
				var walletamount = PaymentViewModel.getProperty("/WalletAmount");
				var cashamount = PaymentViewModel.getProperty("/Cashamount");
				var cardamount = PaymentViewModel.getProperty("/CardAmount");
				var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
				var aanipayamount = PaymentViewModel.getProperty("/AaniPayAmount");
				var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
				var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");
				var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(walletamount) + parseFloat(aanipayamount);
				var Balance = PaymentConstant.ArrayZeroLength;
				if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
					Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
				}
				Balance = Balance - parseFloat(Total);
				Balance = parseFloat(Balance);

				PaymentViewModel.setProperty("/CouponAmount", parseFloat(Balance).toFixed(2));
			} else {
				PaymentViewModel.setProperty("/Coupon_CheckBoxSeleted", false);
				PaymentViewModel.setProperty("/CouponAmount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered when coupon mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressCouponselect: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var Seleted = oEvent.getSource().getSelected();
			if (Seleted) {
				PaymentViewModel.setProperty("/CouponMOPPanelExpand", true);
				var walletamount = PaymentViewModel.getProperty("/WalletAmount");
				var cashamount = PaymentViewModel.getProperty("/Cashamount");
				var cardamount = PaymentViewModel.getProperty("/CardAmount");
				var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
				var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
				var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");
				var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(walletamount);
				var Balance = PaymentConstant.ArrayZeroLength;
				if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
					Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
				}
				Balance = Balance - parseFloat(Total);
				Balance = parseFloat(Balance);

				PaymentViewModel.setProperty("/CouponAmount", parseFloat(Balance).toFixed(2));

			} else {
				PaymentViewModel.setProperty("/CouponMOPPanelExpand", false);
				// reset amount 
				PaymentViewModel.setProperty("/CouponAmount", PaymentConstant.initialiseZero);
			}
			PaymentViewModel.refresh();
		},
		/**
		 * Function triggered while changing coupon mop amount input.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
		 * @author MM
		 */
		onChangeCouponMop: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = PaymentViewModel.getProperty("/Cashamount");
			var cardamount = PaymentViewModel.getProperty("/CardAmount");
			var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
			var couponamount = parseFloat(oValue).toFixed(2);
			var amount = this.getView().getModel("oGlobalModel").getProperty("/Cardamount");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
			if (Total > amount) {
				MessageToast.show(this.oBundle.getText("payment_messageToastGreaterThanOrderAmount") + " " + amount);
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				PaymentViewModel.setProperty("/CouponAmount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered while changing coupon mop amount input.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
		 * @author MM
		 */
		onChangeCouponMop: function (oEvent) {
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = this.getView().getModel("PaymentViewModel").getProperty("/Cashamount");
			var cardamount = this.getView().getModel("PaymentViewModel").getProperty("/CardAmount");
			var loyaltyamount = this.getView().getModel("PaymentViewModel").getProperty("/Loyaltyamount");
			var couponamount = parseFloat(oValue).toFixed(2);
			var amount = this.getView().getModel("oGlobalModel").getProperty("/Cardamount");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
			if (Total > amount) {
				MessageToast.show(this.oBundle.getText("payment_messageToastGreaterThanOrderAmount") + " " + amount);
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				this.getView().getModel("PaymentViewModel").setProperty("/CouponAmount", PaymentConstant.initialiseZero);
			}
		},

		//  Wallet MOP 
		/**
		 * Function triggered when wallet Coupon panel expand.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onExpandWallet: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var expan = oEvent.getSource().getExpanded();
			if (expan) {
				PaymentViewModel.setProperty("/Wallet_CheckBoxSeleted", true);
				var couponamount = PaymentViewModel.getProperty("/CouponAmount");
				var cashamount = PaymentViewModel.getProperty("/Cashamount");
				var cardamount = PaymentViewModel.getProperty("/CardAmount");
				var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
				var aanipayamount = PaymentViewModel.getProperty("/AaniPayAmount");
				var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
				var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");

				if (!cashamount) {
					cashamount = "0";
				}
				if (!cardamount) {
					cardamount = "0";
				}
				if (!loyaltyamount) {
					loyaltyamount = "0";
				}
				if (!couponamount) {
					couponamount = "0";
				}
				if (!aanipayamount) {
					aanipayamount = "0";
				}

				var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(aanipayamount);
				var Balance = PaymentConstant.ArrayZeroLength;
				if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
					Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
					Balance = Balance - parseFloat(Total);
					Balance = parseFloat(Balance);
				} else {
					Balance = parseFloat(soAmount) - parseFloat(Total);
				}
				this.getView().getModel("PaymentViewModel").setProperty("/WalletAmount", parseFloat(Balance).toFixed(2));

				var adnocPlusCard = this.getView().getModel("PaymentViewModel").getData().WalletNumber;
				if (!adnocPlusCard) {
					this.onpressScanADNOCPlus();
					MessageToast.show(this.oBundle.getText("msgwalletscanError"));
				}
			} else {
				this.getView().getModel("PaymentViewModel").setProperty("/Wallet_CheckBoxSeleted", false);
				this.getView().getModel("PaymentViewModel").setProperty("/WalletAmount", PaymentConstant.initialiseZero);
			}
		},

		/**
		 * Function triggered when wallet mop select.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -, 
		 * @author MM
		 */
		onPressWalletselect: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var Seleted = oEvent.getSource().getSelected();
			if (Seleted) {
				PaymentViewModel.setProperty("/WalletMOPPanelExpand", true);
				var couponamount = PaymentViewModel.getProperty("/CouponAmount");
				var cashamount = PaymentViewModel.getProperty("/Cashamount");
				var cardamount = PaymentViewModel.getProperty("/CardAmount");
				var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
				var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
				var soAmount = this.getView().getModel("oGlobalModel").getProperty("/SalesorderTotal");
				var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
				var Balance = PaymentConstant.ArrayZeroLength;
				if (parseFloat(paidAmount) > PaymentConstant.ArrayZeroLength) {
					Balance = parseFloat(soAmount) - parseFloat(paidAmount); // neglecting the paid amount from salesorder total amount
				}
				Balance = Balance - parseFloat(Total);
				Balance = parseFloat(Balance);

				PaymentViewModel.setProperty("/WalletAmount", parseFloat(Balance).toFixed(2));

			} else {
				PaymentViewModel.setProperty("/WalletMOPPanelExpand", false);
				// reset amount 
				PaymentViewModel.setProperty("/WalletAmount", PaymentConstant.initialiseZero);
			}
			PaymentViewModel.refresh();
		},

		/**
		 * Function triggered while changing coupon mop amount input.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
		 * @author MM
		 */
		onLiveChangeWalletMop: function (oEvent) {
			let input = oEvent.getSource();
			let value = input.getValue();

			// Remove non-numeric and more than one dot
			value = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
			input.setValue(value);
		},

		/**
		 * Function triggered while changing coupon mop amount input.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
		 * @author MM
		 */
		onChangeWalletMop: function (oEvent) {
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var oValue = oEvent.getSource().getValue();
			oEvent.getSource().setValue(parseFloat(oValue).toFixed(2));
			var cashamount = PaymentViewModel.getProperty("/Cashamount");
			var cardamount = PaymentViewModel.getProperty("/CardAmount");
			var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
			var couponamount = parseFloat(oValue).toFixed(2);
			var amount = this.getView().getModel("oGlobalModel").getProperty("/Cardamount");
			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount);
			if (Total > amount) {
				MessageToast.show(this.oBundle.getText("payment_messageToastGreaterThanOrderAmount") + " " + amount);
				oEvent.getSource().setValue(PaymentConstant.initialiseZero)
				PaymentViewModel.setProperty("/CouponAmount", PaymentConstant.initialiseZero);
			}
		},


		onPressNavtoPaymentapp: function () {
			var globalModel = this.getView().getModel("oGlobalModel").getData();
			var Cardamount = globalModel.CardAmount;

			MessageToast.show(this.oBundle.getText("home_messageToastNavigatingToPaymentApp"));
			// Android Package app to payment app

			let currentUrl = 'com.packages.carcare://vehicleinspection-manage?sap-ui-app-id-hint=saas_approuter_adnoc.vi.vehicleinspection';
			// URL encode it
			let encodedReturnUrl = encodeURIComponent(currentUrl);

			// JSON object with data
			var jsonData = {
				TXN_TYPE: PaymentConstant.saleTXNType,
				AMOUNT: parseFloat(Cardamount).toFixed(2),
				ADNOC_INVOICE: globalModel.UTRN,
				binCampaigns: ""
			};

			// Convert JSON object to string
			var jsonString = JSON.stringify(jsonData);

			// // Encode the JSON string to be URL-safe
			var encodedJsonString = encodeURIComponent(jsonString);
			var uri = "adnoc://sapmetapay.com/cardpayment?AdnocReqData=" + encodedJsonString + "&returnUrl=" + encodedReturnUrl;
			window.location.href = uri;

		},
		ongetSOdetails: function (SO) {
			var so = this.getView().getModel("oGlobalModel").getProperty("/Saleorder");
			var vAuthcode = this.getView().getModel("oGlobalModel").getProperty("/Authcode");
			this.getView().getModel("VehicleinspectionService").read("/PaymentSet", {
				filters: [
					new Filter("serviceRequestNo", FilterOperator.EQ, so)
				],
				urlParameters: {
					$expand: "items"
				},
				success: function (oData) {
					var obj = "";
					var itemsarr = oData.results[0].items.results;
					itemsarr.forEach(item => {
						if (item.mop === CARD) {
							item.approvalCode = vAuthcode;
							obj = item;
						}
					});
					if (obj) {
						this._saveDetails(obj);
					}
				}.bind(this),
				error: function (oError) {
					// BusyIndicator.hide();
					MessageBox.error(oError.message);
				}.bind(this)
			});
		},
		/**
		* Function triggered clear global model & nav to home.
		* @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		* @version 1.0.0
		* @since 06.11.2024
		* @fires _ClearGlobalModel
		* @author MM
		*/
		onPressBack: function () {
			this.closepaymentPage();
		},
		/**
		 * Function triggered clear blobal model.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires -
		 * @author MM
		 */
		_ClearGlobalModel: function () {
			var oGlobalModel = this.getView().getModel("oGlobalModel").getData();
			/*Search Customer/vehicle Details*/
			oGlobalModel.Profile_BPNo = "";
			oGlobalModel.Profile_BPType = "";
			oGlobalModel.Profile_CustomerUUID = "";
			oGlobalModel.Profile_Name1 = "";
			oGlobalModel.Profile_Name2 = "";
			oGlobalModel.Profile_Name3 = "";
			oGlobalModel.Profile_Name4 = "";
			oGlobalModel.Profile_CountryCode = "";
			oGlobalModel.Profile_Mobile = "";
			oGlobalModel.Profile_Email = "";
			oGlobalModel.Profile_Address = "";
			oGlobalModel.Profile_Street = "";
			oGlobalModel.Profile_Housenum = "";
			oGlobalModel.Profile_Postal = "";
			oGlobalModel.Profile_City = "";
			oGlobalModel.Profile_Country = "";

			oGlobalModel.Profile_Emirates = "";
			oGlobalModel.Profile_PlateKind = "";
			oGlobalModel.Profile_PlateNo = "";
			oGlobalModel.Profile_PlateCode = "";
			oGlobalModel.Profile_Manufacturer = "";
			oGlobalModel.Profile_Model = "";
			oGlobalModel.Profile_CarType = "";
			oGlobalModel.Profile_VINNo = "";
			oGlobalModel.Profile_FleetNumber = "";
			oGlobalModel.Profile_VehicleUUID = "";

			oGlobalModel.SO_UUID = "";
			oGlobalModel.UTRN = "";
			oGlobalModel.SO_OrderID = PaymentConstant.Notstarted;
			oGlobalModel.SO_Items = "";
			oGlobalModel.SO_Number = "";
			oGlobalModel.SO_MOPItems = "";

			// oGlobalModel.G_WashCount = PaymentConstant.ArrayZeroLength;
			oGlobalModel.LoyaltyID = "";
			oGlobalModel.LoyaltyIDMasked = "";
			oGlobalModel.LoyaltyBal = "";
			oGlobalModel.LoyaltyID = "";
			oGlobalModel.LoyaltyBal = "";
			oGlobalModel.Loyalty_ScanedIDInp = "";
			oGlobalModel.LoyaltyCustName = "";
			oGlobalModel.FragmentWidth = PaymentConstant.FragmentWidthDesktopTablet;
			oGlobalModel.Loyalty_ScanedIDManualInp = "";
			oGlobalModel.Loyalty_EmiratesLoyaltySwitch = PaymentConstant.booleanTrue;


			oGlobalModel.Object = "";  // store FAB responce json object
			oGlobalModel.Saleorder = "";
			oGlobalModel.Authcode = "";
			oGlobalModel.TransactionMessage = "";
			oGlobalModel.Cardno = "";
			oGlobalModel.Cardname = "";
			oGlobalModel.Cardamount = "";
			oGlobalModel.AdnocInvoice = "";
			oGlobalModel.RRN = "";

			oGlobalModel.SoItems = "";
			oGlobalModel.PlateNo = "";
			oGlobalModel.SONumber = "";
			oGlobalModel.SO_Total = "";
			oGlobalModel.MOPItems = "";
			oGlobalModel.s4invoiceno = "";
			oGlobalModel.EmiratesTokenSerial = "";
			oGlobalModel.EmiratesID = "";
			oGlobalModel.WalletNumber = "",
			oGlobalModel.WalletNumberMask = "",
			oGlobalModel.Profile_GuestCustomer = "";
			oGlobalModel.PayerNo = "";
			oGlobalModel.CustomerGroupCode = "";
			oGlobalModel.P24Customer = "",
			oGlobalModel.CustomerTypeCode = "",
			oGlobalModel.CRMID = "",
			oGlobalModel.CIAMID = "",
			oGlobalModel.IdentificationNo = "",

			this.getView().getModel("oGlobalModel").refresh();
		},

		onSavepayment: function () {
			var oModel = this.getView().getModel("PaymentViewModel");
			var oGlobalModel = this.getView().getModel("oGlobalModel").getData();

			var cashamount = oModel.getProperty("/Cashamount");
			var cardamount = oModel.getProperty("/CardAmount");
			var Loyaltyamount = oModel.getProperty("/Loyaltyamount");
			var couponamount = oModel.getProperty("/CouponAmount");
			var walletamount = oModel.getProperty("/WalletAmount");
			var aanipayamount = oModel.getProperty("/AaniPayAmount");
			var paidAmount = oModel.getProperty("/PaidAmount");

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
			if (!aanipayamount) {
				aanipayamount = PaymentConstant.initialiseZero;
			}

			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(Loyaltyamount) + parseFloat(couponamount) + parseFloat(walletamount) + parseFloat(aanipayamount) + parseFloat(paidAmount);
			var soamount = oGlobalModel.SalesorderTotal;
			var loyaltyId = oGlobalModel.LoyaltyID;
			var adnocPluscard = oGlobalModel.WalletNumber;
			if (parseFloat(soamount) === parseFloat(Total)) { // Condition to check if so amount and mop amount is matching equal

				if (parseFloat(cardamount) > Constant.ArrayZeroLength && parseFloat(aanipayamount) > Constant.ArrayZeroLength) {
					MessageToast.show(this.oBundle.getText("msgBankAani"));
				} else {

					if (loyaltyId) {//condition to check whether user has scanned the loyalty id

						var loyaltypoints = oGlobalModel.LoyaltyBal;
						var redeemablepoints = parseFloat(Loyaltyamount) * 1000;
						if (parseFloat(Loyaltyamount) > PaymentConstant.ArrayZeroLength && parseFloat(walletamount) > PaymentConstant.ArrayZeroLength && adnocPluscard) {
							
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
							this.onPressCheckCard();
							MessageToast.show(this.oBundle.getText("msgLoyaltyScanError"));
						}
						else {
							this.onPresspayment();
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
							MessageBox.confirm(
								this.oBundle.getText("home_messageToastAddloyalty"), {
								icon: MessageBox.Icon.CONFIRM,
								title: this.oBundle.getText("msgConfirmation"),
								actions: [MessageBox.Action.YES, MessageBox.Action.NO],
								onClose: function (oAction) {
									if (oAction === MessageBox.Action.YES) {
										this.onPressCheckCard();
									} else if (oAction === MessageBox.Action.NO) {
										this.onPresspayment();
									}
								}.bind(this)
							});
							MessageToast.show(this.oBundle.getText("home_messageToastScanLoyaltyId"));
						}
					}
				}
			} else {
				if (Total === PaymentConstant.ArrayZeroLength) {
					MessageToast.show(this.oBundle.getText("home_messageToastPleaseSelectMOP"));
				} else {
					MessageToast.show(this.oBundle.getText("home_messageToastAmountNotMatch"));
				}

			}

		},


		/**
		 * Function triggered when we doing payment.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 06.11.2024
		 * @fires onPressNavtoPaymentapp, _updateOrderstatus, _ModelInitialLoad, _ClearGlobalModel
		 * @author MM
		 */
		onPresspayment: function () {
			var oGlobalModel = this.getView().getModel("oGlobalModel").getData();
			var PaymentViewModel = this.getView().getModel("PaymentViewModel");
			var orderNumber = oGlobalModel.SONumber;
			var SO_UUID = oGlobalModel.SO_UUID;
			var soamount = oGlobalModel.SalesorderTotal
			var aMOPTypes = this.getView().getModel("oGlobalModel").getProperty("/MopTypes");
			var arrMOPItems = oGlobalModel.MOPItems;

			var cashamount = PaymentViewModel.getProperty("/Cashamount");
			var cardamount = PaymentViewModel.getProperty("/CardAmount");
			var couponamount = PaymentViewModel.getProperty("/CouponAmount");
			var loyaltyamount = PaymentViewModel.getProperty("/Loyaltyamount");
			var walletamount = PaymentViewModel.getProperty("/WalletAmount");
			var paidAmount = PaymentViewModel.getProperty("/PaidAmount");
			var aanipayamount = PaymentViewModel.getProperty("/AaniPayAmount");
			var loyaltyAuthcode = PaymentViewModel.getProperty("/LoyaltyAuthcode");
			var PayerNo = this.getView().getModel("oGlobalModel").getProperty("/PayerNo");
			var walletAuthcode = PaymentViewModel.getProperty("/walletAuthcode");
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

			var moparr = [];
			var count = PaymentConstant.ArrayZeroLength;
			var cardflag = "";
			var plant = this.getView().getModel("oGlobalModel").getProperty("/MainPlant");
			var smoptype = "";
			var smopDescription = "";
			var CLMMessage = PaymentViewModel.getProperty("/CLMMessage");
			var LoyaltyID = this.getView().getModel("oGlobalModel").getProperty("/LoyaltyID");
			if (!CLMMessage) {
				CLMMessage = "";
			} else {
				CLMMessage = this.oBundle.getText("loyaltyId") + " " + LoyaltyID + " " + CLMMessage;
			}
			if (walletAuthcode) {
				CLMMessage = CLMMessage + "\n" + this.oBundle.getText("walletTransId") + " " + walletAuthcode;
			}
			if (arrMOPItems.length !== PaymentConstant.ArrayZeroLength) {
				count = arrMOPItems[arrMOPItems.length - 1].paymentItem;
			}
			if (parseFloat(cashamount) > PaymentConstant.ArrayZeroLength) {
				var sCashkey = PaymentConstant.cashkey
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sCashkey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}
				count = parseInt(count) + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": cashamount,
					"mopCode": smoptype,
					"clmMessage": CLMMessage,
					"status": PaymentConstant.SuccessStatus

				};
				moparr.push(obj);
			}
			if (parseFloat(cardamount) > PaymentConstant.ArrayZeroLength) {
				var sCardkey = PaymentConstant.cardkey;
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sCardkey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}
				cardflag = PaymentConstant.FlagX;
				count = parseInt(count) + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": cardamount,
					"mopCode": smoptype,
					"clmMessage": CLMMessage

				};
				moparr.push(obj);
				this.getView().getModel("oGlobalModel").setProperty("/CardAmount", cardamount);
			}

			if (parseFloat(aanipayamount) > PaymentConstant.ArrayZeroLength) {
				var sCardkey = PaymentConstant.cardkey;
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sCardkey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}
				count = parseInt(count) + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": aanipayamount,
					"mopCode": smoptype,
					"clmMessage": CLMMessage

				};
				moparr.push(obj);
			}

			if (parseFloat(loyaltyamount) > PaymentConstant.ArrayZeroLength) {
				var sloyaltykey = PaymentConstant.loyaltykey;
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sloyaltykey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}
				count = parseInt(count) + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": loyaltyamount,
					"mopCode": smoptype,
					"clmMessage": CLMMessage,
					"status": PaymentConstant.SuccessStatus,
					"approvalCode": loyaltyAuthcode

				};
				moparr.push(obj);
			}

			if (parseFloat(couponamount) > PaymentConstant.ArrayZeroLength) {
				var sCouponkey = PaymentConstant.couponkey;
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sCouponkey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}
				count = parseInt(count) + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": couponamount,
					"mopCode": smoptype,
					"clmMessage": CLMMessage,
					"status": PaymentConstant.SuccessStatus

				};
				moparr.push(obj);
			}

			if (parseFloat(walletamount) > PaymentConstant.ArrayZeroLength) {
				var sCouponkey = PaymentConstant.walletkey;
				const aMOPType = aMOPTypes.filter(key => key.valueKey === sCouponkey);
				if (aMOPType.length !== PaymentConstant.ArrayZeroLength) {
					smoptype = aMOPType[0].mopCode;
					smopDescription = aMOPType[0].mopText;
				}
				count = parseInt(count) + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": walletamount,
					"mopCode": smoptype,
					"clmMessage": CLMMessage,
					"status": PaymentConstant.SuccessStatus,
					"approvalCode": walletAuthcode,
					"payer": PayerNo

				};
				moparr.push(obj);
			}

			var Total = parseFloat(cashamount) + parseFloat(cardamount) + parseFloat(loyaltyamount) + parseFloat(couponamount) + parseFloat(walletamount) + parseFloat(aanipayamount) + parseFloat(paidAmount);
			orderNumber = orderNumber.toString();
			if (parseFloat(soamount) === parseFloat(Total)) {
				var payload = {
					"orderNumber": orderNumber,
					"totalValue": soamount,
					"orderUUID_orderUUID": SO_UUID,
					"items": moparr
				};
				BusyIndicator.show();
				this.getView().getModel("VehicleinspectionService").create("/PaymentSet", payload, {
					success: function (oData) {
						BusyIndicator.hide();
						if (parseFloat(cardamount) > 0) {
							this.onPressNavtoPaymentapp();
						} else if (parseFloat(aanipayamount) > 0) {
							this.onPressNavtoAaniPayPaymentapp();
						} else {
							PaymentViewModel.setProperty("/MOPVisible", false);
							// this._ongetSOdetails(orderNumber);
							this._getUpdatedPaymentDetails(orderNumber);
							var that = this;
							this.intervalHandle = setTimeout(function () {
								that._updateOrderstatus(orderNumber);
							}, 300);
							MessageBox.success(oData.orderNumber + " " + this.oBundle.getText("home_messageToastDataSavedSuccessfully") + "\n" + CLMMessage, {
								icon: MessageBox.Icon.SUCCESS,
								title: "Success",
								actions: [this.oBundle.getText("btnGenerateInvoice"), this.oBundle.getText("payment_Print"), MessageBox.Action.CANCEL],
								onClose: function (oAction) {
									if (oAction === this.oBundle.getText("payment_Print")) {
										this.onnewprint();
										this._ModelInitialLoad();
									}
									else if (oAction === this.oBundle.getText("actionCancel")) {
										this._ModelInitialLoad();
										this.closepaymentPage();
									} else if (oAction === this.oBundle.getText("btnGenerateInvoice")) {
										this._ModelInitialLoad();
									}
								}.bind(this)
							});
						}
						// }
					}.bind(this),
					error: function (oError) {
						BusyIndicator.hide();
						MessageBox.error(oError.message);
					}.bind(this)
				});
			} else {
				if (Total === PaymentConstant.ArrayZeroLength) {
					MessageToast.show(this.oBundle.getText("home_messageToastPleaseSelectMOP"));
				} else {
					MessageToast.show(this.oBundle.getText("home_messageToastAmountNotMatch"));
				}
			}
		},

		/**
		 * Function triggered to get MOP list and details.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.PaymentDetails
		 * @version 1.0.0
		 * @since 02.04.2025
		 * @fires -
		 * @author MM
		 */
		_getMopData: function () {
			BusyIndicator.show();
			this.getView().getModel("VehicleinspectionService").read("/MOPTypesSet", {
				success: function (oData) {
					BusyIndicator.hide();
					this.getView().getModel("oGlobalModel").setProperty("/MopTypes", oData.results);
				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					MessageBox.error(oError.message);
				}.bind(this)
			});
		},

		closepaymentPage: function () {
			var hash = window.location.hash;
			if (hash.includes("?")) {
				var [path, paramString] = hash.split("?");
				var params = new URLSearchParams(paramString);
				if (params.has("message")) {
					params.delete("message");
					var newHash = path + (params.toString() ? "?" + params.toString() : "");
					window.location.hash = newHash;
					// HashChanger.getInstance().replaceHash(newHash);
					this._oRouter = UIComponent.getRouterFor(this);
					this._oRouter.navTo("OpenOrders", {}, true);

				}
			}
		},
		onPressRedeemLoyalty: function () {
			var oModel = this.getView().getModel("PaymentViewModel").getData();
			var oGlobalModel = this.getView().getModel("oGlobalModel").getData();
			var loyaltyId = oGlobalModel.LoyaltyID;
			var trxno = oGlobalModel.UTRN;
			var Itemsarr = [];
			var itemnumber = PaymentConstant.ArrayZeroLength;
			let location = oGlobalData.MainPlantSiteNo
			oGlobalModel.SoItems.forEach(function (item) {
				itemnumber = itemnumber + 10;
				var obj = {
					"lineNo": itemnumber,
					"code": item.Material,
					"category": item.Category,
					"name": item.ServiceName,
					"quantity": parseFloat(item.Qty),
					"amount": parseFloat(item.SubTotalAfterDis),
					"discounted": false
				};
				Itemsarr.push(obj);
			});

			var trnno = oGlobalModel.UTRN;
			var redeemablepoints = null;
			var loyaltyamount = oModel.Loyaltyamount;
			if (parseFloat(loyaltyamount) > PaymentConstant.ArrayZeroLength) {
				redeemablepoints = parseFloat(loyaltyamount) * 1000;
			} else {
				redeemablepoints = null;
			}
			var arrCoupon = [];
			var currdate = new Date();
			var businessdate = Formatter.getDateFromatIn_yyyyMMdd(currdate);


			// Passing the MOP info to the loaylaty payload
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
				"comment": PaymentConstant.LoyaltyComment,
				"partner": PaymentConstant.CLMPartner,
				"date": businessdate,
				"currencyCode": PaymentConstant.Currency,
				"paymentMethods": paymentmethods,
				"trnNo": trxno.toString(),
				"utrn": trxno.toString(),
				"coupons": arrCoupon,
				"burnPoints": redeemablepoints,
				"products": Itemsarr,
				"lineOfBusiness": PaymentConstant.LineofBusiness,
				"businessDate": oGlobalData.EmployeeData.BusinessDate,
				"location": oGlobalModel.siteNumber
			};

			sInput = JSON.stringify(sInput);
			var odataModel = this.getView().getModel("VehicleinspectionService");
			var Busy = new sap.m.BusyDialog();
			Busy.open();

			odataModel.callFunction("/fetchInputDetails", {
				method: Constant.GET,
				urlParameters: { input: sInput, loyaltyID: loyaltyId, simulation: false },
				success: function (oData, response) {
					Busy.close();
					var response = oData.fetchInputDetails.responseData;
					oModel.CLMMessage = response.message;
					oModel.LoyaltyAuthcode = response.transactionId.toString();
					MessageToast.show(response.message);
					this.getView().getModel("PaymentViewModel").refresh();
					if (parseFloat(oModel.WalletAmount) > 0) {
						this.postPayment24();
					} else {
						this.onPresspayment();
					}
					

				}.bind(this),
				error: function (oError) {
					Busy.close();
					if (JSON.parse(oError.responseText)) {
						MessageBox.error(JSON.parse(oError.responseText).error.message.value);
					} else {
						MessageBox.error(oError.message);
					}
				}
			});

		},
		getSiteNumber: function (Plant) {
			this.getView().getModel("VehicleinspectionService").read("/PlantMasters", {

				success: function (oData) {
					if (oData.results.length !== PaymentConstant.ArrayZeroLength) {
						var arrsitenumber = oData.results.filter(function (e) {
							return e.site === Plant;
						});
						if (arrsitenumber.length !== PaymentConstant.ArrayZeroLength) {
							var oGlobalModelRes = this.getView().getModel("oGlobalModel")
							oGlobalModelRes.setProperty("/MainPlant", arrsitenumber[0].plantCode);
							oGlobalModelRes.setProperty("/MainPlantDesc", arrsitenumber[0].plantName);
							oGlobalModelRes.setProperty("/MainPlantSiteNo", arrsitenumber[0].legacySiteNo);
							oGlobalModelRes.setProperty("/MainPlantCustomer", arrsitenumber[0].plantCustomer);
						}
					}
				}.bind(this),
				error: function (oError) {
					if (oError.statusCode === PaymentConstant.ErrorCode401 || oError.statusCode === PaymentConstant.ErrorCode403) {
						MessageBox.error(this.oBundle.getText("mainMenu_messageBoxNoPlantAccess"));
					} else {
						MessageBox.error(oError.message);
					}
				}.bind(this)
			});
		},

		onscannedvalueLivechange: function (oEvent) {
			var value = oEvent.getSource().getValue();
			// Allow only letters, numbers, and colon (:) added on 18-07-2025
			var value = value.replace(/[^a-zA-Z0-9:]/g, '');
			oEvent.getSource().setValue(value)
			value = value.split("AA1:")[1];
			this.DecryptLoyaltyId(value);
		},
		onscannedvalueLivechange1: function (oEvent) {
			var value = oEvent.getSource().getValue();
			// Allow only letters, numbers, and colon (:) added on 18-07-2025
			var value = value.replace(/[^a-zA-Z0-9:]/g, '');
			oEvent.getSource().setValue(value)
			value = value.split("AA1:")[1];
			this.DecryptLoyaltyId(value);
		},
		onReadKey: function () {
			const oModel = this.getView().getModel("VehicleinspectionService");
			BusyIndicator.show(0);
			oModel.callFunction("/getKey", {
				method: Constant.GET,
				// urlParameters: oParameters,
				success: function (oData, response) {
					BusyIndicator.hide();
					this.getView().getModel("oGlobalModel").setProperty("/DecryptKey", oData.getKey.key.value);
					this.getView().getModel("oGlobalModel").setProperty("/DecryptIV", oData.getKey.iv.value);

				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					MessageBox.error(oError.message);
				}
			});
		},
		DecryptLoyaltyId: function (input) {
			var keyvalue = this.getView().getModel("oGlobalModel").getProperty("/DecryptKey");
			var ivvalue = this.getView().getModel("oGlobalModel").getProperty("/DecryptIV");
			var keystring = keyvalue.match(/.{1,2}/g).reduce((acc, char) => acc + String.fromCharCode(parseInt(char, 16)), "");
			var ivstring = ivvalue.match(/.{1,2}/g).reduce((acc, char) => acc + String.fromCharCode(parseInt(char, 16)), "");
			var key = CryptoJS.enc.Utf8.parse(keystring); // keyvalue
			var iv = CryptoJS.enc.Utf8.parse(ivstring); //iv value
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
			var loyaltyid = jsonparse.LOY;

			this.fetchloyaltyDetails(loyaltyid);

		},

		getPaymentMOP: function (SO) {
			BusyIndicator.show();
			this.getView().getModel("VehicleinspectionService").read("/PaymentSet", {
				filters: [
					new Filter("serviceRequestNo", FilterOperator.EQ, SO)
				],
				urlParameters: {
					$expand: "items"
				},
				success: function (oData, oResponse) {
					BusyIndicator.hide();
					if (oData.results.length !== PaymentConstant.ArrayZeroLength) {
						var aMOPItems = oData.results[0].items.results;
						aMOPItems = aMOPItems.filter(key => key.status !== PaymentConstant.FailedStatus);
						this.getView().getModel("oGlobalModel").setProperty("/MOPItems", aMOPItems);
					}
				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					MessageBox.error(oError.message);
				}.bind(this)
			});

		},


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
				}, 100);
			});

			// this.onReadKey();
		},
		oncloseAdnocPluscard: function () {
			if (this.ADNOCPlusFrag) {
				this.ADNOCPlusFrag.close();
			}
		},
		_getPayment24CustDetails: function (AdnocPlusCardNo) {
			const oModel = this.getView().getModel("VehicleinspectionService");
			var globalmodel = this.getView().getModel("oGlobalModel");
			var orderModel = this.getView().getModel("PaymentViewModel").getData();
			BusyIndicator.show(Constant.ArrayZeroLength);
			oModel.callFunction("/getP24CustomerDetail", {
				method: Constant.GET,
				urlParameters: { input: AdnocPlusCardNo },
				success: function (oData) {
					BusyIndicator.hide();
					var bptype = globalmodel.getData().Profile_BPType;
					if (oData.getP24CustomerDetail) {
						MessageToast.show(this.oBundle.getText("home_messageToastPleaseRemoveCard"));  // Message text changes on 11-07-2025

						if (bptype) {
							if (oData.getP24CustomerDetail.CustomerGroupCode.match(bptype) !== null) {

								var responsedata = oData.getP24CustomerDetail;
								var balance = responsedata.Balance;
								var p24Customer = responsedata.FullName.trim();
								var P24Accountnumber = responsedata.AccountNumber;
								var PayerNo = responsedata.PayerNo;
								var CustomerGroupCode = responsedata.CustomerGroupCode;
								var CustomerTypeCode = responsedata.CustomerTypeCode;

								if (this.ADNOCPlusFrag && this.ADNOCPlusFrag.isOpen()) {
									this.ADNOCPlusFrag.close();
								}
								globalmodel.setProperty("/P24Accountnumber", P24Accountnumber);
								globalmodel.setProperty("/P24Balance", balance);
								globalmodel.setProperty("/P24Customer", p24Customer);
								globalmodel.setProperty("/PayerNo", PayerNo);
								globalmodel.setProperty("/CustomerGroupCode", CustomerGroupCode);
								globalmodel.setProperty("/CustomerTypeCode", CustomerTypeCode);
								this.getView().getModel("PaymentViewModel").setProperty("/WalletNumber", AdnocPlusCardNo);
								this.getView().getModel("oGlobalModel").setProperty("/WalletNumber", AdnocPlusCardNo);
								// this.getView().getModel("ServicesViewModel").setProperty("/PayerNo", PayerNo);
								var AdnocPlusCardNoMasked = AdnocPlusCardNo.replace(AdnocPlusCardNo.substring(3, AdnocPlusCardNo.length - 2), "******");
								globalmodel.setProperty("/WalletNumberMask", AdnocPlusCardNoMasked);
								var b2btype = PaymentConstant.P24Postpaid;
								if (oData.getP24CustomerDetail.CustomerTypeCode.match(b2btype) !== null) {
									if (parseFloat(orderModel.Cashamount) > PaymentConstant.ArrayZeroLength || parseFloat(orderModel.CardAmount) > PaymentConstant.ArrayZeroLength
										|| parseFloat(orderModel.Loyaltyamount) > PaymentConstant.ArrayZeroLength || parseFloat(orderModel.AaniPayAmount) > PaymentConstant.ArrayZeroLength) {
										orderModel.Cashamount = PaymentConstant.constzero;
										orderModel.CardAmount = PaymentConstant.constzero;
										orderModel.Loyaltyamount = PaymentConstant.constzero;
										orderModel.AaniPayAmount = PaymentConstant.constzero;
										MessageToast.show(this.oBundle.getText("msgPayment24B2B"));

										orderModel.CashMOPPanelExpand = false;
										orderModel.Cash_CheckBoxSeleted = false;

										orderModel.CardMOPPanelExpand = false;
										orderModel.Card_CheckBoxSeleted = false;

										orderModel.AanipayMOPPanelExpand = false;
										orderModel.Aanipay_CheckBoxSeleted = false;

										orderModel.LoyaltyMOPPanelExpand = false;
										orderModel.Loyalty_CheckBoxSeleted = false;

										this.getView().getModel("ServicesViewModel").refresh();
									}
								}

							} else {
								MessageToast.show(this.oBundle.getText("msgwalletTypeError") + " " + bptype)
							}
						}
					}
				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					if (JSON.parse(oError.responseText)) {
						MessageBox.error(JSON.parse(oError.responseText).error.message.value);
					} else {
						MessageBox.error(oError.message);
					}
				}
			});
		},
		onManualcheckAdnocplus: function () {
			var adnocpluscardno = this.getView().getModel("oGlobalModel").getProperty("/ADNOCPlusManualInput");
			if (adnocpluscardno) {
				this._getPayment24CustDetails(adnocpluscardno);
			} else {
				MessageToast.show(this.oBundle.getText("msgEnterADNOCPlusCardno"));
			}
		},
		postPayment24: function () {
			var oModel = this.getView().getModel("PaymentViewModel").getData();
			var oGlobalModel = this.getView().getModel("oGlobalModel").getData();
			var currdate = new Date();
			currdate = Formatter.getDateFromatIn_yyyyMMdd(currdate);
			var articlesarr = [];

			let soAmount = parseFloat(oGlobalModel.SalesorderTotal);  // basket Value
			let amountpayable = parseFloat(oModel.WalletAmount); //amount payable by payment 24
			let factor = (amountpayable / soAmount);
			let runningTotal = 0.00;

			for (var i = 0; i < oGlobalModel.SoItems.length; i++) {

				if (oGlobalModel.SoItems.length !== i + 1) {
					let currentmaterialAmount = parseFloat(oGlobalModel.SoItems[i].totalPrice);
					factorAmount = parseFloat((factor * currentmaterialAmount).toFixed(2)); // material net amount
					runningTotal += factorAmount;
				} else {
					// For the last item, adjust to make total exactly amountToPay
					var factorAmount = parseFloat((amountpayable - runningTotal).toFixed(2));
				}
				let taxAmount = parseFloat((factorAmount * 5) / 105).toFixed(2); // material tax amount

				var obj = {
					"amount": parseFloat(factorAmount),
					"productCode": oGlobalModel.SoItems[i].Material,
					"productName": oGlobalModel.SoItems[i].ServiceName,
					"quantity": oGlobalModel.SoItems[i].Qty,
					"vatAmount": taxAmount,
					"vatPercentage": PaymentConstant.vatPercentage
				};
				articlesarr.push(obj);
			}

			var payload = {
				"merchantNumber": oGlobalModel.siteNumber,
				"totalAmount": parseFloat(oModel.WalletAmount),
				"odometerReading": "",
				"dateTime": currdate,
				"referencenumber": oGlobalModel.UTRN,
				"product": articlesarr,
				"customer": {
					"tokenNumber": oGlobalModel.WalletNumber
				},
				"type": PaymentConstant.payment24auth,
				"validationRules": {
					"validateProduct": false
				},
				"businessDateTime": currdate
			};

			var sInput = JSON.stringify(payload);
			var odataModel = this.getView().getModel("VehicleinspectionService");
			var Busy = new sap.m.BusyDialog();
			Busy.open();

			odataModel.callFunction("/getPaymentP24", {
				method: Constant.GET,
				urlParameters: { input: sInput },
				success: function (oData) {
					Busy.close();

					if (oData.getPaymentP24.message === PaymentConstant.payment24msg && oData.getPaymentP24.transactionId) {
						oModel.walletAuthcode = oData.getPaymentP24.transactionId.toString();
						this.getView().getModel("PaymentViewModel").refresh;

						var loyaltyamount = oModel.Loyaltyamount;
						if (parseFloat(loyaltyamount) > 0) {
							var loyaltypoints = oGlobalModel.LoyaltyBal;
							var redeemablepoints = parseFloat(loyaltyamount) * 1000;
							if (parseInt(redeemablepoints) < parseFloat(loyaltypoints)) {
								this.onLoyaltySimulation();
							} else {
								MessageToast.show(this.oBundle.getText("msgLoyaltyRedeemError1"));
							}
						} else {
							this.onPresspayment();
						}
					} else {
						MessageToast.show(this.oBundle.getText("walletError"));
					}



				}.bind(this),
				error: function (oError) {
					Busy.close();
					if (JSON.parse(oError.responseText)) {
						MessageBox.error(JSON.parse(oError.responseText).error.message.value);
					} else {
						MessageBox.error(oError.message);
					}
				}
			});
		},
		
		onLoyaltySimulation: function () {
			var oModel = this.getView().getModel("PaymentViewModel").getData();
			var oGlobalModel = this.getView().getModel("oGlobalModel").getData();
			var Partner = PaymentConstant.LineofBusiness;
			var AED = PaymentConstant.Currency;
			var Category = PaymentConstant.LoyaltyMatCategory;
			var location = oGlobalModel.MainPlantSiteNo
			var PaymentMethod = PaymentConstant.LoyaltyPaymethod;
			var Comment = PaymentConstant.LoyaltyComment;
			var trxno = oGlobalModel.UTRN;

			var loyaltyId = oGlobalModel.LoyaltyID;
			if (loyaltyId) {

				var Itemsarr = [];
				var item = 10;
				for (var i = 0; i < oGlobalModel.SoItems.length; i++) {
					var itemstring = item.toString();
					var obj = {
						"lineNo": parseInt(itemstring),
						"code": oGlobalModel.SoItems[i].Material,
						"category": oGlobalModel.SoItems[i].ProductHierarchy,
						"name": oGlobalModel.SoItems[i].ServiceName,
						"quantity": parseFloat(oGlobalModel.SoItems[i].Qty),
						"amount": parseFloat(oGlobalModel.SoItems[i].totalPrice),
						"discounted": false
					};
					item = item + 10;
					Itemsarr.push(obj);
				}


				var currdate = new Date();

				currdate = Formatter.getDateFromatIn_yyyyMMdd(currdate);
				var businessDate = Formatter.getDateFromatIn_yyyyMMdd(currdate);

				var redeemablepoints = null;
				var loyaltyamount = oModel.Loyaltyamount;
				if (parseFloat(loyaltyamount) > PaymentConstant.ArrayZeroLength) {
					redeemablepoints = parseFloat(loyaltyamount) * 1000;
				} else {
					redeemablepoints = null;
				}
				var paymentmethods = [];
				var sInput = {
					"comment": Comment,
					"partner": PaymentConstant.CLMPartner,
					"location": location,
					"date": businessDate,
					"currencyCode": AED,
					"paymentMethods": paymentmethods,
					"trnNo": trxno.toString(),
					"utrn": trxno.toString(),
					"coupons": [],
					"burnPoints": redeemablepoints,
					"products": Itemsarr,
					"lineOfBusiness": Partner,
					"businessDate": businessDate,
				}

				sInput = JSON.stringify(sInput);
				var odataModel = this.getView().getModel("VehicleinspectionService");
				BusyIndicator.show(0);
				odataModel.callFunction("/fetchInputDetails", {
					method: Constant.GET,
					urlParameters: { input: sInput, loyaltyID: loyaltyId, simulation: true },
					success: function (oData, response) {
						BusyIndicator.hide();
						var responsedata = oData.fetchInputDetails.responseData;
						if (redeemablepoints !== null) {
							if (responsedata.burnPoints === redeemablepoints) {
								this.onPressRedeemLoyalty();
							} else if (parseFloat(oModel.Loyaltyamount) > PaymentConstant.ArrayZeroLength && responsedata.burnPoints === PaymentConstant.ArrayZeroLength) {
								MessageToast.show(this.oBundle.getText("noLoyaltyRedemption"));
							} else if (responsedata.burnPoints < redeemablepoints) {
								var redeeamableamount = responsedata.burnPointsMoney;
								MessageBox.error(this.oBundle.getText("maxAllowedLoyaltyPoints") + "\n" + " " + responsedata.burnPoints.toString() +
									this.oBundle.getText("maxAllowedLoyaltyPoints1") + "\n" + this.oBundle.getText("maxAllowedLoyaltyPoints2") + " " + redeeamableamount.toString() + this.oBundle.getText("currency_AED"));
							} else if (responsedata.bonusPoints > PaymentConstant.ArrayZeroLength || responsedata.bonusPoints === PaymentConstant.ArrayZeroLength || parseFloat(oModel.Loyaltyamount) === PaymentConstant.ArrayZeroLength) {
								this.onPressRedeemLoyalty();
							}
						} else {
							this.onPressRedeemLoyalty();
						}

					}.bind(this),
					error: function (oError) {
						BusyIndicator.hide();
						if (JSON.parse(oError.responseText)) {
							MessageBox.error(JSON.parse(oError.responseText).error.message.value);
						} else {
							MessageBox.error(oError.message);
						}
					}
				});
			} else {
				MessageToast.show(this.oBundle.getText("msgLoyaltyScanError"));
				this.onPressCheckCard();
			}
		},


		_getBpType: function (customer) {

			var oGlobalModel = this.getView().getModel("oGlobalModel");
			var b2btype = PaymentConstant.ZBTB;
			var b2ctype = PaymentConstant.B2C;
			var CustomerNumber = String(customer);
			this.getView().getModel("VehicleinspectionService").read(`/CustomerVehicleSet(${CustomerNumber.toString()})`, {

				success: function (oData) {
					if (oData.bpGrouping) {
						var customertype = "";
						var bpGrouping = oData.bpGrouping;
						if (bpGrouping === PaymentConstant.StvarZBTC) {
							customertype = b2ctype;
						} else if (bpGrouping === PaymentConstant.Z001) {
							customertype = b2btype;
						}
						oGlobalModel.setProperty("/Profile_BPType", customertype);
					}
					// Storing Mobile number added on 25-07-25
					if (oData.mobile) {
						oGlobalModel.setProperty("/Profile_CountryCode", oData.extension);
						oGlobalModel.setProperty("/Profile_Mobile", oData.mobile);
					} else {
						oGlobalModel.setProperty("/Profile_CountryCode", "");
						oGlobalModel.setProperty("/Profile_Mobile", "");
					}

					// Storing Customer Name added on 01-08-25
					if (oData.name1 || oData.name2 || oData.name3 || oData.name4) {
						oGlobalModel.setProperty("/Profile_Name1", oData.name1);
						oGlobalModel.setProperty("/Profile_Name2", oData.name2);
						oGlobalModel.setProperty("/Profile_Name3", oData.name3);
						oGlobalModel.setProperty("/Profile_Name4", oData.name4);
					} else {
						oGlobalModel.setProperty("/Profile_Name1", "");
						oGlobalModel.setProperty("/Profile_Name2", "");
						oGlobalModel.setProperty("/Profile_Name3", "");
						oGlobalModel.setProperty("/Profile_Name4", "");
					}

					// Store Email
					if (oData.email) {
						oGlobalModel.setProperty("/Profile_Email", oData.email);
					} else {
						oGlobalModel.setProperty("/Profile_Email", "");
					}
				}.bind(this),
				error: function (oError) {
					// MessageBox.error(oError.message);
				}
			});
		},
		onReadAdnocPlusCard: function () {
			$.ajax({
				url: PaymentConstant.AdnocCardURL,
				method: Constant.GET,
				dataType: 'json',
				success: function (data) {
					var base64string = data.cardData;
					var decodedstring = atob(base64string);
					this.getView().getModel("PaymentViewModel").setProperty("/WalletNumber", decodedstring);
					this.getView().getModel("oGlobalModel").setProperty("/WalletNumber", decodedstring);

					this._getPayment24CustDetails(decodedstring);
				}.bind(this), error: function (jqXHR, textStatus, errorThrown) {
					MessageToast.show(this.oBundle.getText("home_messageToastErrorfetchingcarddata"));

				}.bind(this)
			});
		},
		onpressReadEmiratesCardLoyalty: function () {
			var source = PaymentConstant.loyalty;
			this.onReadEmiratesCard(source);
		},
		onpressReadEmiratesCardP24Fragment: function () {
			var source = PaymentConstant.wallet;
			this.onReadEmiratesCard(source);
		},

		onPressNavtoAaniPayPaymentapp: function () {  // AaniPay

			MessageToast.show(this.oBundle.getText("home_messageToastNavigatingToPaymentApp"));
			var sUTRN = this.getView().getModel("oGlobalModel").getProperty("/UTRN");
			var cardamount = this.getView().getModel("PaymentViewModel").getProperty("/AaniPayAmount");

			// SAP Start with payemnt screen Android package
			let currentUrl = 'com.packages.carcare://vehicleinspection-manage?sap-ui-app-id-hint=saas_approuter_adnoc.vi.vehicleinspection';

			// URL encode it
			let encodedReturnUrl = encodeURIComponent(currentUrl);

			// JSON object with data
			var jsonData = {
				TXN_TYPE: PaymentConstant.AaniPayTxnType,
				AMOUNT: parseFloat(cardamount).toFixed(2),
				ADNOC_INVOICE: sUTRN, //ADNOC_Invoice,
				binCampaigns: "",
			};

			// Convert JSON object to string
			var jsonString = JSON.stringify(jsonData);

			// Encode the JSON string to be URL-safe
			var encodedJsonString = encodeURIComponent(jsonString);

			// var uri = "adnoc://sapmetapay.com/card?data=" + encodedJsonString + "&returnUrl=" + encodedReturnUrl;
			var uri = "adnoc://sapmetapay.com/cardpayment?AdnocReqData=" + encodedJsonString + "&returnUrl=" + encodedReturnUrl;
			window.location.href = uri;

		},

		_getUpdatedPaymentDetails: function (SO) {
			var oModel = this.getView().getModel("PaymentViewModel");
			BusyIndicator.show();
			this.getView().getModel("VehicleinspectionService").read("/PaymentSet", {
				filters: [
					new Filter("serviceRequestNo", FilterOperator.EQ, SO)
				],
				urlParameters: {
					$expand: "items"
				},
				success: function (oData) {
					BusyIndicator.hide();
					if (oData.results.length !== PaymentConstant.ArrayZeroLength) {
						// var aMOPItems = oData.results[0].items.results;
						// this.getView().getModel("oGlobalModel").setProperty("/MOPItems", aMOPItems);

						var aMOPItems = [];
						for (var i = 0; i < oData.results.length; i++) {
							aMOPItems = aMOPItems.concat(oData.results[i].items.results);
						}
						this.getView().getModel("oGlobalModel").setProperty("/MOPItems", aMOPItems);
					}

				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					MessageBox.error(oError.message);
				}.bind(this)
			});

		},



		// Retry payment function added on 22-07-2025
		onPressRetryPaymentapp: function () {

			var globalModel = this.getView().getModel("oGlobalModel").getData();
			var Cardamount = globalModel.CardAmount;

			var txntype = "";
			if (globalModel.Object.TXN_TYPE === PaymentConstant.saleTXNType) {
				txntype = PaymentConstant.saleTXNType;
			} else if (globalModel.Object.TXN_TYPE === PaymentConstant.AaniPayTxnType) {
				txntype = PaymentConstant.AaniPayTxnType;
			}

			MessageToast.show(this.oBundle.getText("home_messageToastNavigatingToPaymentApp"));
			// Android Package app to payment app

			let currentUrl = 'com.packages.carcare://vehicleinspection-manage?sap-ui-app-id-hint=saas_approuter_adnoc.vi.vehicleinspection';
			// URL encode it
			let encodedReturnUrl = encodeURIComponent(currentUrl);

			// JSON object with data
			var jsonData = {
				TXN_TYPE: txntype,  // pass dynamic based on the trans type
				AMOUNT: parseFloat(Cardamount).toFixed(2),
				ADNOC_INVOICE: globalModel.UTRN,
				binCampaigns: ""
			};

			// Convert JSON object to string
			var jsonString = JSON.stringify(jsonData);

			// // Encode the JSON string to be URL-safe
			var encodedJsonString = encodeURIComponent(jsonString);
			var uri = "adnoc://sapmetapay.com/cardpayment?AdnocReqData=" + encodedJsonString + "&returnUrl=" + encodedReturnUrl;
			window.location.href = uri;

		},

		//	While retrying Bank or Aani Pay, a new item was inserted into the payment items table for the retry on 29-07-2025

		onPressRetryPayment: function () {
			var oGlobalModel = this.getView().getModel("oGlobalModel");
			var retryamount = oGlobalModel.getProperty("/CardAmount");
			var retrytxntype = oGlobalModel.getProperty("/Object");
			var moptypesArr = oGlobalModel.getProperty("/MopTypes");
			var SO_MOPItems = oGlobalModel.getProperty("/MOPItems");
			var soamount = oGlobalModel.getProperty("/SalesorderTotal");
			var orderno = oGlobalModel.getProperty("/SONumber");
			var SO_UUID = oGlobalModel.getProperty("/SO_UUID");

			var smoptype = "";
			var smopDescription = "";
			var moparr = [];

			var count = PaymentConstant.ArrayZeroLength;
			if (SO_MOPItems.length !== PaymentConstant.ArrayZeroLength) {
				count = SO_MOPItems[SO_MOPItems.length - 1].paymentItem;
			}

			if (retrytxntype.TXN_TYPE === PaymentConstant.saleTXNType) {
				var skey = PaymentConstant.cardkey;
				var mopindex = moptypesArr.findIndex(E1 => E1.valueKey === skey);
				var errorindex = PaymentConstant.findindexerror;
				if (mopindex !== errorindex) {
					smoptype = moptypesArr[mopindex].mopCode;
					smopDescription = moptypesArr[mopindex].mopText;
				}

				count = parseInt(count) + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": smopDescription,
					"amount": retryamount,
					"mopCode": smoptype
				};
				moparr.push(obj);
			}

			if (retrytxntype.TXN_TYPE === PaymentConstant.AaniPayTxnType) {
				var skey = PaymentConstant.cardkey;
				var mopindex = moptypesArr.findIndex(E1 => E1.valueKey === skey);
				var errorindex = PaymentConstant.findindexerror;
				if (mopindex !== errorindex) {
					smoptype = moptypesArr[mopindex].mopCode;
					smopDescription = moptypesArr[mopindex].mopText;
				}

				count = parseInt(count) + 1;
				var obj = {
					"paymentItem": count.toString(),
					"mop": PaymentConstant.AanipayMop,
					"amount": retryamount,
					"mopCode": smoptype
				};
				moparr.push(obj);
			}

			var payload = {
				"orderNumber": orderno.toString(),
				"totalValue": soamount,
				"orderUUID_orderUUID": SO_UUID,
				"items": moparr,
			};
			BusyIndicator.show(0);
			this.getView().getModel("VehicleinspectionService").create("/PaymentSet", payload, {
				success: function (oData, oResponse) {
					BusyIndicator.hide();
					this.onPressRetryPaymentapp();
				}.bind(this),
				error: function (oError) {
					BusyIndicator.hide();
					MessageBox.error(oError.message);
				}.bind(this)
			});
		},
	});

});