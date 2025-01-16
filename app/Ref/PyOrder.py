# 야후 아마존 오더 정리 파이널 파일
import pandas as pd
import os
import pykakasi
import sys
from datetime import date

mode = ""


def get_mode():
    global mode
    selected = None
    while selected not in [1, 2]:
        selected = int(input("mode값을 입력해주세요 [1:Amazon 2:Yahoo 3:All] : "))
        if selected == 1:
            mode = "amazon"
            return mode
        elif selected == 2:
            mode = "yahoo"
            return mode
        elif selected == 3:
            mode = "all"
            return mode


def greetings():
    global orderFolder, today
    today = date.today()
    orderFolder = "OrderData-" + today.isoformat()

    todayShowDate = today.isoformat()

    if mode == "amazon":
        print("[{}]안녕하세요? 아마존 오더를 정리중입니다.".format(todayShowDate))
    elif mode == "yahoo":
        print("[{}]안녕하세요? 야후 오더를 정리중입니다.....".format(todayShowDate))


def get_code():
    codeSource = pd.read_excel("AMZCODE.xlsx")
    code = codeSource.set_index("sku").to_dict("index")
    return code


# 지정된 폴더에서 아마존/야후 오더 리스트 받는 함수


def get_Files():
    allFiles = os.listdir(orderFolder)
    if mode == "amazon":
        file_list = [file for file in allFiles if file.endswith(".txt")]
    elif mode == "yahoo":
        file_list = [file for file in allFiles if file.endswith(".csv")]
    return file_list


# 야후 오더의 product파일과 order파일을 합치는 함수


def yahoo_files(file_list):
    fileOrder = [file for file in file_list if file.startswith("YahooOrder")]
    fileProduct = [file for file in file_list if file.startswith("YahooProduct")]

    fileOrder = fileOrder[0]
    fileProduct = fileProduct[0]

    file_order = pd.DataFrame()
    file_product = pd.DataFrame()
    df = pd.DataFrame()

    file_order = pd.read_csv(
        "./" + orderFolder + "/" + fileOrder,
        encoding="cp932",
    )
    file_product = pd.read_csv(
        "./" + orderFolder + "/" + fileProduct,
        encoding="cp932",
    )
    file_order.fillna("", inplace=True)
    dic_order = file_order.set_index("Id").to_dict("index")

    df = file_product.loc[:, ["Id", "ItemId", "Title", "Quantity", "UnitPrice"]]
    df["ShipName"] = ""
    df["ShipNameKana"] = ""
    df["ShipZipCode"] = ""
    df["addressModified"] = ""
    df["ShipPrefecture"] = ""
    df["ShipCity"] = ""
    df["ShipAddress1"] = ""
    df["ShipAddress2"] = ""
    df["ShipPhoneNumber"] = ""

    for key, value in dic_order.items():
        df.loc[df.Id == key, "ShipName"] = value["ShipName"]
        df.loc[df.Id == key, "ShipNameKana"] = value["ShipNameKana"]
        df.loc[df.Id == key, "ShipZipCode"] = value["ShipZipCode"]
        df.loc[df.Id == key, "addressModified"] = (
            str(value["ShipPrefecture"])
            + str(value["ShipCity"])
            + str(value["ShipAddress1"])
            + str(value["ShipAddress2"])
        )
        df.loc[df.Id == key, "ShipCity"] = value["ShipCity"]
        df.loc[df.Id == key, "ShipAddress1"] = value["ShipAddress1"]
        df.loc[df.Id == key, "ShipAddress2"] = value["ShipAddress2"]
        df.loc[df.Id == key, "ShipPhoneNumber"] = value["ShipPhoneNumber"]
    return df


def change_columns(df):
    if mode == "yahoo":
        df.rename(
            columns={
                "Id": "reference No.",
                "ItemId": "sku",
                "Title": "product-name",
                "Quantity": "quantity-purchased",
                "UnitPrice": "unit value",
                "ShipName": "Consignees NAME",
                "ShipNameKana": "Kana",
                "ShipZipCode": "ConsigneesPOST",
                "addressModified": "Consignees Address",
                "ShipPhoneNumber": "ConsigneesPhonenumber",
            },
            inplace=True,
        )

    elif mode == "amazon":

        # df.rename(columns={'order-id': 'reference No.',
        #           'recipient-name': 'Consignees NAME', 'buyer-name': 'Kana', 'ship-postal-code': 'ConsigneesPOST', 'address_modified': 'Consignees Address', 'ship-address-3': 'Consignees Address 2', 'buyer-phone-number': 'ConsigneesPhonenumber'}, inplace=True)
        if df is not None and hasattr(df, "columns"):
            columns_to_rename = {
                "order-id": "reference No.",
                "recipient-name": "Consignees NAME",
                "buyer-name": "Kana",
                "ship-postal-code": "ConsigneesPOST",
                "address_modified": "Consignees Address",
                "ship-address-3": "Consignees Address 2",
                "buyer-phone-number": "ConsigneesPhonenumber",
            }

            # 현재 데이터프레임에서 존재하는 컬럼만 바꾸기
            existing_columns = {
                col: new_col
                for col, new_col in columns_to_rename.items()
                if col in df.columns
            }
            df.rename(columns=existing_columns, inplace=True)

    return df


def get_orderData(file):

    df = pd.DataFrame()
    # 여러 인코딩 시도
    encodings = ["cp932", "utf-8", "ISO-8859-1"]  # 시도할 인코딩 리스트
    # df = pd.read_csv('./'+orderFolder+'/'+file, encoding="cp932", sep="\t")
    df = None
    for encoding in encodings:
        try:
            df = pd.read_csv(f"./{orderFolder}/{file}", encoding=encoding, sep="\t")
            return df
        except UnicodeDecodeError:
            print(f"Failed to read with {encoding} encoding, trying next...")
        except Exception as e:
            print(f"An error occurred: {e}")
            break  # 다른 에러 발생 시 루프 종료

        if df is None:
            print("Failed to read the file with any of the provided encodings.")
            break


def get_address(df):
    if df is not None:
        df.fillna("", inplace=True)
        df["address_modified"] = (
            df["ship-state"].astype(str)
            + df["ship-city"].astype(str)
            + df["ship-address-1"].astype(str)
            + " "
            + df["ship-address-2"].astype(str)
            + " "
            + +df["ship-address-3"].astype(str)
        )
        return df
    else:
        print("DataFrame is None, cannot apply fillna.")
        exit


def add_column(df):
    # 아마존 오더인경우만 추가할 칼럼
    if mode == "amazon":
        df["unit value"] = ""
    df["product name_eng"] = ""
    df["code"] = ""
    df["tracking"] = ""
    df["bag No"] = ""
    df["name_eng"] = ""
    df["shipper Name"] = ""
    df["shipper address"] = ""
    df["shipper phone"] = ""
    df["term"] = ""
    df["invoiceTotal"] = ""
    df["number of parcels"] = 1
    df["weight"] = ""
    df["origin"] = "NZ"
    df["site"] = ""
    return df


def input_data(df, code):
    for key, value in code.items():
        # 아마존 오더인경우만 실행할 코드
        if mode == "amazon":
            df.loc[df.sku == key, "unit value"] = value["sales price"]
        df.loc[df.sku == key, "invoiceTotal"] = (
            df["unit value"] * df["quantity-purchased"]
        )
        df.loc[df.sku == key, "weight"] = value["weight"]
        df.loc[df.sku == key, "Consignees Address 2"] = ""
        df.loc[df.sku == key, "product name_eng"] = value["product"]

        if value["site"] == "NZP":
            prefix = "IT"
        elif value["site"] == "YAH":
            prefix = "Y"
        elif value["site"] == "NZP_USA":
            prefix = "NU"
        elif value["site"] == "SKY":
            prefix = "S"
        elif value["site"] == "SKY_USA":
            prefix = "SU"
        elif value["site"] == "ARH":
            prefix = "A"
        df.loc[df.sku == key, "code"] = prefix + str(value["code"])
        df.loc[df.sku == key, "site"] = value["site"]
    return df


def select_site(df):
    site = df.loc[0, "site"]
    if site == "NZP" or site == "YAH":
        df["shipper Name"] = "International Network and Trading Ltd.,"
        df["shipper address"] = (
            "Unit D3 27-29, William Pickering Drive Albany, Auckland, 0632"
        )
        df["shipper phone"] = "021-0292-3057"
    elif site == "SKY" or site == "ARH" or site == "SKYUSA":
        df["shipper Name"] = "Skywell Ltd.,"
        df["shipper address"] = "Unit 9/ 77 Porana Road, Hillcrest  Auckland"
        df["shipper phone"] = "98804620"

    else:
        df["shipper Name"] = "No Data"
        df["shipper address"] = "No Data"
        df["shipper phone"] = "No Data"
    return df, site


def input_hiragana(df):
    kakasi = pykakasi.kakasi()
    if mode == "amazon":
        kakasi.setMode("J", "a")
        names = list(df.loc[:, "Consignees NAME"])
    elif mode == "yahoo":
        kakasi.setMode("K", "a")
        names = list(df.loc[:, "Kana"])
    conversion = kakasi.getConverter()
    nameList = []
    for index in range(len(names)):
        nameList.append(conversion.do(names[index]))
    df["Kana"] = nameList


def input_hiragana_new(df):
    names = list(df.loc[:, "Consignees NAME"])
    nameList = []
    kks = pykakasi.kakasi()
    for index in range(len(names)):
        result = kks.convert(names[index])
        for item in result:
            nameList.append(item["passport"].capitalize())
    df["Kana"] = nameList


def output_file(df, site):
    columnNames = [
        "site",
        "reference No.",
        "tracking",
        "bag No",
        "Consignees NAME",
        "Kana",
        "ConsigneesPOST",
        "Consignees Address",
        "Consignees Address 2",
        "ConsigneesPhonenumber",
        "shipper Name",
        "shipper address",
        "shipper phone",
        "term",
        "invoiceTotal",
        "number of parcels",
        "weight",
        "product name_eng",
        "quantity-purchased",
        "unit value",
        "origin",
        "code",
        "product-name",
    ]

    df_output = df[columnNames]
    fileName = site + "_JapanOrder_" + today.isoformat() + ".xlsx"
    # 대문자로 바꾸기
    df_output.loc[:, "product name_eng"] = df_output.loc[
        :, "product name_eng"
    ].str.upper()
    df_output.to_excel("./" + orderFolder + "/" + fileName)
    return fileName


def do_yahoo():
    code = get_code()
    fileList = get_Files()
    df = yahoo_files(fileList)
    df = change_columns(df)
    df = add_column(df)
    df = input_data(df, code)
    df, site = select_site(df)
    df.sort_values(["product name_eng", "quantity-purchased"], inplace=True)
    input_hiragana(df)
    fileName = output_file(df, site)
    print("데이터가 출력 되었습니다. =>", fileName)


# if mode == 'yahoo':
#     code = get_code()
#     fileList = get_Files()
#     df = yahoo_files(fileList)
#     df = change_columns(df)
#     df = add_column(df)
#     df = input_data(df, code)
#     df, site = select_site(df)
#     df.sort_values(['product name_eng', 'quantity-purchased'], inplace=True)
#     input_hiragana(df)
#     fileName = output_file(df, site)
#     print("데이터가 출력 되었습니다. =>", fileName)


def do_amazon():
    code = get_code()
    fileList = get_Files()
    for df in fileList:
        df = get_orderData(df)
        df = get_address(df)
        df = change_columns(df)
        df = add_column(df)
        df = input_data(df, code)
        df, site = select_site(df)
        df.sort_values(["product name_eng", "quantity-purchased"], inplace=True)
        input_hiragana(df)
        fileName = output_file(df, site)
        print("데이터가 출력 되었습니다. =>", fileName)


# elif mode == 'amazon':
# code = get_code()
# fileList = get_Files()
# for df in fileList:
#     df = get_orderData(df)
#     df = get_address(df)
#     df = change_columns(df)
#     df = add_column(df)
#     df = input_data(df, code)
#     df, site = select_site(df)
#     df.sort_values(
#         ['product name_eng', 'quantity-purchased'], inplace=True)
#     input_hiragana(df)
#     fileName = output_file(df, site)
#     print("데이터가 출력 되었습니다. =>", fileName)


# 전역변수 선언
mode = ""
orderFolder = ""
today = ""

mode = get_mode()
if mode == "amazon":
    greetings()
    do_amazon()
elif mode == "yahoo":
    greetings()
    do_yahoo()
elif mode == "all":
    greetings()
    mode = "amazon"
    do_amazon()
    mode = "yahoo"
    do_yahoo()
