/**
 * Danh mục VBPL thực tế bóc tách tự động từ kho Data_Legal_2026 (51 tệp PDF).
 * Sinh bởi: scripts/ingest_data_legal_2026.py — KHÔNG sửa tay.
 * Toàn văn đầy đủ & chỉ mục tìm kiếm FTS5 lưu trong .local_data/vbpl/04_warehouse/vbpl_warehouse.sqlite.
 */

import { LegalDocument } from '../types/lexPmoTypes';

export const DATA_LEGAL_2026_CORE_OVERRIDES: Record<
  string,
  Pick<LegalDocument, 'ssotFileName' | 'issueDate' | 'effectiveDate' | 'tags' | 'lineage'>
> = {
  "DOC-135": {
    "ssotFileName": "135-2025_LUAT-QH15_HDXD_LuatXayDung.pdf",
    "issueDate": "10/12/2025",
    "effectiveDate": "01/07/2026",
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 68 trang",
      "LV: HDXD",
      "G0",
      "G2",
      "G5"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2025]_135-2025_Luat_QH15_LuatXayDung.pdf · 68 trang · 4.16 MB · SHA256: 3F4615874B89)"
  },
  "DOC-206": {
    "ssotFileName": "206-2026_ND-CP_QLCP_QuanLyChiPhiDauTuXayDung.pdf",
    "issueDate": "15/06/2026",
    "effectiveDate": "01/07/2026",
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 33 trang",
      "LV: QLCP",
      "G2",
      "G5",
      "G9"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_206-2026_ND_CP_QLCP.pdf · 33 trang · 15.65 MB · SHA256: 19F0D67FDAC2)"
  },
  "DOC-207": {
    "ssotFileName": "207-2026_ND-CP_QLCL_QuanLyChatLuongThiCongVaBaoTri.pdf",
    "issueDate": "15/06/2026",
    "effectiveDate": "01/07/2026",
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 100 trang",
      "LV: QLCL",
      "G12",
      "G14",
      "G15"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_207-2026_ND_CP_QLCL.pdf · 100 trang · 44.34 MB · SHA256: 7C94829604B7)"
  },
  "DOC-209": {
    "ssotFileName": "209-2026_ND-CP_VLXD_QuanLyVatLieuXayDung.pdf",
    "issueDate": "15/06/2026",
    "effectiveDate": "01/07/2026",
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 10 trang",
      "LV: VLXD",
      "G12",
      "G14"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_209-2026_ND_CP_QLVL.pdf · 10 trang · 4.63 MB · SHA256: F02E1788D520)"
  },
  "DOC-210": {
    "ssotFileName": "210-2026_ND-CP_QLHD_HopDongXayDung.pdf",
    "issueDate": "15/06/2026",
    "effectiveDate": "01/07/2026",
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 44 trang",
      "LV: QLHD",
      "G10",
      "G11",
      "G13"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_210-2026_ND_CP_QLHDXD.pdf · 44 trang · 21.39 MB · SHA256: E056DF11A3D5)"
  },
  "DOC-212": {
    "ssotFileName": "212-2026_ND-CP_HDXD_DieuKienNangLucVaCSDLQuocGiaHDXD.pdf",
    "issueDate": "17/06/2026",
    "effectiveDate": "01/07/2026",
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 75 trang",
      "LV: HDXD",
      "G5",
      "G7",
      "G10"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_212-2026_ND_CP_NLXDCSDL.pdf · 75 trang · 30.21 MB · SHA256: 59FE5682D86E)"
  },
  "DOC-217": {
    "ssotFileName": "217-2026_ND-CP_HDXD_QuanLyHoatDongXayDung.pdf",
    "issueDate": "19/06/2026",
    "effectiveDate": "01/07/2026",
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 150 trang",
      "LV: HDXD",
      "G2",
      "G5",
      "G7"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_217-2026_ND_CP_QLXD.pdf · 150 trang · 59.73 MB · SHA256: C66C5AA477FB)"
  }
};

export const DATA_LEGAL_2026_NEW_DOCS: LegalDocument[] = [
  {
    "id": "DOC-DL26-69D1EDA8",
    "ssotFileName": "1040-2026_QD-BXD_QLHD_CongBoMauHopDongXayDung.pdf",
    "docNumber": "1040/QĐ-BXD",
    "docType": "QD",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLHD",
    "title": "Quyết định 1040/QĐ-BXD công bố hệ thống mẫu hợp đồng xây dựng (7 mẫu hợp đồng & hướng dẫn áp dụng)",
    "shortSummary": "Quyết định 1040/QĐ-BXD công bố hệ thống mẫu hợp đồng xây dựng (7 mẫu hợp đồng & hướng dẫn áp dụng)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 3,
    "clauseTotalCount": 7,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLHD"
    ],
    "linkedGates": [
      "G10",
      "G11",
      "G13"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 2 trang",
      "LV: QLHD",
      "G10",
      "G11",
      "G13"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_1040-2026_QD_BXD_CongBoMauHopDongXayDung.pdf · 2 trang · 0.42 MB · SHA256: 69D1EDA8C6F2)",
    "nodes": [
      {
        "id": "DL26-69D1ED-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 21,
        "content": "BỘ XÂY DỰNG\nCỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố: 1040/QĐ-BXD\nHà Nội, ngày 26 tháng 6 năm 2026\nQUYẾT ĐỊNH\nCông bố mẫu hợp đồng xây dựng\nBỘ TRƯỞNG BỘ XÂY DỰNG\nCăn cứ Luật Xây dựng số 135/2025/QH15;\nCăn cứ Nghị định số 210/2026/NĐ-CP của Chính phủ quy định chi tiết và\nhướng dẫn thi hành một số điều của Luật Xây dựng về hợp đồng xây dựng;\nCăn cứ Nghị định số 217/2026/NĐ-CP của Chính phủ quy định chi tiết một số\nđiều của Luật Xây dựng về quản lý hoạt động xây dựng;\nCăn cứ Nghị định số 206/2026/NĐ-CP của Chính phủ quy định chi tiết về quản\nlý chi phí đầu tư xây dựng;\nCăn cứ Nghị định số 207/2026/NĐ-CP của Chính phủ quy định chi tiết một số\nnội dung về quản lý chất lượng, thi công xây dựng và bảo trì công trình xây dựng;\nCăn cứ Nghị định số 33/2025/NĐ-CP ngày của Chính phủ quy định chức năng,\nnhiệm vụ, quyền hạn và cơ cấu tổ chức của Bộ Xây dựng;\nTheo đề nghị của Cục trưởng Cục Kinh tế - Quản lý đầu tư xây dựng.\nQUYẾT ĐỊNH:"
      },
      {
        "id": "DL26-69D1ED-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Công bố kèm theo Quyết định này các mẫu hợp đồng xây dựng, gồm:",
        "clauseCount": 7,
        "content": "1. Mẫu hợp đồng tư vấn lập báo cáo nghiên cứu khả thi xây dựng tại Phụ lục I;\n2. Mẫu hợp đồng tư vấn thiết kế xây dựng tại Phụ lục II;\n3. Mẫu hợp đồng tư vấn quản lý dự án tại Phụ lục III;\n4. Mẫu hợp đồng tư vấn giám sát thi công xây dựng tại Phụ lục IV;\n5. Mẫu hợp đồng tư vấn khảo sát xây dựng tại Phụ lục V;\n6. Mẫu hợp đồng thi công xây dựng công trình tại Phụ lục VI;\n7. Mẫu hợp đồng EPC tại Phụ lục VII."
      },
      {
        "id": "DL26-69D1ED-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Quyết định này có hiệu lực kể từ ngày 01/7/2026.",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-69D1ED-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Các cơ quan, tổ chức, cá nhân có liên quan tham khảo các mẫu hợp",
        "clauseCount": 1,
        "content": "đồng tại Điều 1 và hướng dẫn sử dụng, vận dụng công bố kèm theo Quyết định này để xác lập và quản lý hợp đồng xây dựng./. Nơi nhận: - Bộ trưởng (để b/c); - Văn phòng Quốc hội; - Hội đồng Dân tộc, các Ủy ban của Quốc hội; - Văn phòng Chủ tịch nước; - Văn phòng Chính phủ; - Cơ quan TW của các đoàn thể; - Các Bộ, cơ quan ngang bộ; - UBND các tỉnh, thành phố trực thuộc TW; - Tòa án nhân dân tối cao; - Viện Kiểm sát nhân dân tối cao; - Các Sở Xây dựng, các Sở có CTXD chuyên ngành; - Cổng thông tin điện tử Bộ Xây dựng; - Các đơn vị thuộc, trực thuộc Bộ Xây dựng; - Lưu: VT, KTQLXD. KT. BỘ TRƯỞNG THỨ TRƯỞNG Bùi Xuân Dũng"
      }
    ]
  },
  {
    "id": "DOC-DL26-0DE8BE6D",
    "ssotFileName": "1041-2026_QD-BXD_QLCP_HuongDanXacDinhKhoiLuongCongTrinh.pdf",
    "docNumber": "1041/QĐ-BXD",
    "docType": "QD",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Quyết định 1041/QĐ-BXD công bố Hướng dẫn phương pháp xác định khối lượng công trình xây dựng",
    "shortSummary": "Quyết định 1041/QĐ-BXD công bố Hướng dẫn phương pháp xác định khối lượng công trình xây dựng",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 3,
    "clauseTotalCount": 47,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G12",
      "G13",
      "G15"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 8 trang",
      "LV: QLCP",
      "G9",
      "G12",
      "G13"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_1041-2026_QD_BXD_XDkhoiluong.pdf · 8 trang · 1.03 MB · SHA256: 0DE8BE6D2F1F)",
    "nodes": [
      {
        "id": "DL26-0DE8BE-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 16,
        "content": "BỘ XÂY DỰNG\nCỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố:  1041 /QĐ-BXD\nHà Nội, ngày 26 tháng 6 năm 2026\nQUYẾT ĐỊNH\nCông bố Hướng dẫn xác định khối lượng công trình\nBỘ TRƯỞNG BỘ XÂY DỰNG\nCăn cứ Luật Xây dựng số 135/2025/QH15;\nCăn cứ Nghị định số 206/2026/NĐ-CP của Chính phủ quy định chi tiết về\nquản lý chi phí đầu tư xây dựng;\nCăn cứ Nghị định số 33/2025/NĐ-CP của Chính phủ quy định chức năng,\nnhiệm vụ, quyền hạn và cơ cấu tổ chức của Bộ Xây dựng;\nTheo đề nghị của Cục trưởng Cục Kinh tế - Quản lý đầu tư xây dựng và\nViện trưởng Viện Kinh tế xây dựng.\nQUYẾT ĐỊNH:"
      },
      {
        "id": "DL26-0DE8BE-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Công bố Hướng dẫn xác định khối lượng công trình kèm theo",
        "clauseCount": 1,
        "content": "Quyết định này."
      },
      {
        "id": "DL26-0DE8BE-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Quyết định này có hiệu lực từ ngày 01 tháng 7 năm 2026.",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-0DE8BE-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Các cơ quan, tổ chức, cá nhân có liên quan đến xác định chi phí",
        "clauseCount": 47,
        "content": "đầu tư xây dựng tham khảo hướng dẫn này để xác định khối lượng xây dựng công trình./. Nơi nhận: - Bộ trưởng (để b/c); - Văn phòng Quốc hội; - Hội đồng Dân tộc, các Ủy ban của Quốc hội; - Văn phòng Chủ tịch nước; - Văn phòng Chính phủ; - Cơ quan TW của các đoàn thể; - Các Bộ, cơ quan ngang bộ; - UBND các tỉnh, thành phố trực thuộc TW; - Tòa án nhân dân tối cao; - Viện Kiểm sát nhân dân tối cao; - Các Sở Xây dựng, các Sở có công trình xây dựng chuyên ngành; - Cổng thông tin điện tử Bộ Xây dựng; - Các đơn vị thuộc, trực thuộc Bộ Xây dựng; - Lưu: VT, Cục KTQLĐTXD, Viện KTXD. KT. BỘ TRƯỞNG THỨ TRƯỞNG Bùi Xuân Dũng HƯỚNG DẪN XÁC ĐỊNH KHỐI LƯỢNG CÔNG TRÌNH (Kèm theo Quyết định số 1041/QĐ-BXD ngày 26 tháng 6 năm 2026 của Bộ trưởng Bộ Xây dựng) I. NGUYÊN TẮC XÁC ĐỊNH KHỐI LƯỢNG\n1. Khối lượng phục vụ xác định chi phí đầu tư xây dựng được xác định phù hợp với mức độ chi tiết của hồ sơ dự án, hồ sơ thiết kế và yêu cầu xác định chi phí tương ứng từng giai đoạn đầu tư xây dựng. Các căn cứ để xác định khối lượng bao gồm hồ sơ dự án, hồ sơ thiết kế xây dựng, chỉ dẫn kỹ thuật, tiêu chuẩn, quy chuẩn kỹ thuật áp dụng, mô hình thông tin công trình (BIM), dữ liệu từ phần mềm, công cụ số và các tài liệu"
      }
    ]
  },
  {
    "id": "DOC-DL26-E38889E7",
    "ssotFileName": "162-2026_QD-UBNDHN_DTU_GiaoCDTNhaOChoThueKhongDauThau.pdf",
    "docNumber": "162/2026/QĐ-UBND",
    "docType": "QD",
    "issuer": "UBNDHN",
    "year": "2026",
    "issueDate": "15/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-DOANHNGHIEP",
    "subSectorCode": "DN_BDS_NO",
    "subSectorLabel": "Kinh doanh BĐS & Nhà ở (Khu đô thị)",
    "primaryDomain": "DTU",
    "title": "Quyết định 162/2026/QĐ-UBND (Hà Nội) về trình tự, thủ tục giao CĐT dự án nhà ở cho thuê không qua đấu giá/đấu thầu",
    "shortSummary": "Quyết định 162/2026/QĐ-UBND (Hà Nội) về trình tự, thủ tục giao CĐT dự án nhà ở cho thuê không qua đấu giá/đấu ",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 10,
    "clauseTotalCount": 95,
    "projectAxes": [
      "DAN_DUNG"
    ],
    "secondaryDomains": [
      "DTU"
    ],
    "linkedGates": [
      "G0",
      "G1",
      "G3",
      "G10"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 13 trang",
      "LV: DTU",
      "G0",
      "G1",
      "G3"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_162-2026_QD_UBND-HN_TTHCNhaOchothue-KhongDauthau.pdf · 13 trang · 1.55 MB · SHA256: E38889E75DBA)",
    "nodes": [
      {
        "id": "DL26-E38889-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 33,
        "content": "ỦY BAN NHÂN DÂN\nTHÀNH PHỐ HÀ NỘI\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố:          /2026/QĐ-UBND\nHà Nội, ngày       tháng      năm 2026\nQUYẾT ĐỊNH\nQuy định trình tự, thủ tục, thẩm quyền, điều kiện giao chủ đầu tư, chấp\nthuận chủ trương đầu tư đồng thời giao chủ đầu tư không thông qua đấu\ngiá, không thông qua đấu thầu đối với dự án đầu tư xây dựng nhà ở cho\nthuê không sử dụng vốn đầu tư công trên địa bàn thành phố Hà Nội\nỦY BAN NHÂN DÂN THÀNH PHỐ HÀ NỘI\nCăn cứ Luật Tổ chức chính quyền địa phương số 72/2025/QH15;\nCăn cứ Luật Ban hành văn bản quy phạm pháp luật số 64/2025/QH15\nđược sửa đổi, bổ sung bởi Luật số 87/2025/QH15;\nCăn cứ Luật Nhà ở số 27/2023/QH15;\nCăn cứ Luật Đất đai số 31/2024/QH15;\nCăn cứ Luật Kinh doanh bất động sản số 29/2023/QH15;\nCăn cứ Nghị quyết số 72/2026/NQ-HĐND ngày 15 tháng 6 năm 2026 của\nHội đồng nhân dân Thành phố quy định cơ chế, chính sách về đầu tư, phát triển\nvà hỗ trợ nhà ở trên địa bàn thành phố Hà Nội (thực hiện điểm đ, điểm e khoản\n2 Điều 12 và điểm b khoản 2 Điều 25 Luật Thủ đô số 02/2026/QH16);\nTheo đề nghị của Giám đốc Sở Xây dựng tại Tờ trình số      /TTr-SXD\nngày      tháng       năm 2026 về ban hành Quyết định của UBND T"
      },
      {
        "id": "DL26-E38889-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Phạm vi điều chỉnh",
        "clauseCount": 1,
        "content": "Quyết định này quy định về trình tự, thủ tục, thẩm quyền, điều kiện giao chủ đầu tư, chấp thuận chủ trương đầu tư đồng thời giao chủ đầu tư không thông qua đấu giá, không thông qua đấu thầu đối với dự án đầu tư xây dựng nhà ở cho thuê không sử dụng vốn đầu tư công bao gồm các công trình nhà ở, hạ tầng kỹ thuật, hạ tầng xã hội và các công trình khác trong phạm vi dự án (nếu có) trên địa bàn thành phố Hà Nội. 14            11"
      },
      {
        "id": "DL26-E38889-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Đối tượng áp dụng",
        "clauseCount": 1,
        "content": "Quyết định này áp dụng đối với các tổ chức, cá nhân liên quan công tác giao chủ đầu tư, chấp thuận chủ trương đầu tư đồng thời giao chủ đầu tư không thông qua đấu giá, không thông qua đấu thầu đối với dự án đầu tư xây dựng nhà ở cho thuê quy định tại Điều 1 Quyết định này."
      },
      {
        "id": "DL26-E38889-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Nguyên tắc chung về thủ tục hành chính trong Quyết định này",
        "clauseCount": 10,
        "content": "1. Việc tiếp nhận hồ sơ và giải quyết các thủ tục hành chính được thực hiện như sau:\na) Tổ chức, cá nhân lập, trình hồ sơ, đề nghị giải quyết thủ tục hành chính chịu trách nhiệm trước pháp luật về tính hợp pháp, chính xác, trung thực của nội dung hồ sơ và các văn bản gửi cơ quan tiếp nhận hồ sơ;\nb) Cơ quan tiếp nhận hồ sơ có trách nhiệm kiểm tra tính hợp lệ của hồ sơ, không được yêu cầu nộp thêm giấy tờ khác ngoài các giấy tờ trong hồ sơ theo quy định của Quyết định này;\nc) Cơ quan, người có thẩm quyền giải quyết thủ tục hành chính chỉ chịu trách nhiệm về những nội dung cho ý kiến, thẩm định, phê duyệt, quyết định theo quy định của Quyết định này; không chịu trách nhiệm về những nội dung đã được cơ quan, người có thẩm quyền khác chấp thuận, thẩm định, phê duyệt hoặc giải quyết trước đó.\n2. Hồ sơ được gửi (01 bộ) bằng một trong các hình thức sau:\na) Gửi trực tiếp;\nb) Thông qua dịch vụ bưu chính;\nc) Gửi các tệp tin chứa bản sao điện tử các thành phần hồ sơ gốc thông qua hình thức dịch vụ công trực tuyến. Trường hợp tệp tin chứa các thành phần hồ sơ có dung lượng lớn, không gửi được thông qua dịch vụ công trực tuyến thì được gửi trực tiếp hoặc thông qua dịch vụ bưu chính.\n3. Trường hợ"
      },
      {
        "id": "DL26-E38889-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Điều kiện giao chủ đầu tư; tiêu chí ưu tiên giao chủ đầu tư",
        "clauseCount": 10,
        "content": "trong trường hợp có từ 02 nhà đầu tư trở lên đề nghị giao chủ đầu tư\n1. Điều kiện giao chủ đầu tư:\na) Nhà đầu tư phải đáp ứng điều kiện đối với tổ chức kinh doanh bất động sản theo quy định tại khoản 1 và khoản 2 Điều 9 của Luật Kinh doanh bất động sản số 29/2023/QH15 đã được sửa đổi, bổ sung một số điều theo Luật số 43/2024/QH15. Trường hợp nhà đầu tư liên danh thì nhà đầu tư do liên danh đề xuất làm chủ đầu tư phải đáp ứng đủ điều kiện theo quy định tại khoản này; các thành viên còn lại trong liên danh phải đáp ứng tỷ lệ vốn chủ sở hữu phân bổ cho dự án theo tỷ lệ vốn góp mà các bên đã thỏa thuận;\nb) Có văn bản cam kết giá cho thuê nhà ở không vượt quá khung giá cho thuê nhà ở do Ủy ban nhân dân Thành phố quy định theo điểm đ khoản 1 Điều 8 Nghị quyết số 72/2026/NQ-HĐND. Giá cho thuê nhà ở do chủ đầu tư xác định theo quy định của pháp luật có liên quan. Trường hợp tại thời điểm giao chủ đầu tư, Ủy ban nhân dân Thành phố chưa ban hành khung giá cho thuê nhà ở thì nhà đầu tư cam kết tuân thủ khung giá cho thuê nhà ở kể từ thời điểm khung giá được ban hành;\nc) Có văn bản cam kết phương án quản lý vận hành dự án đáp ứng quy định tại khoản 1 Điều 6 Nghị quyết số 72/2026/NQ-HĐND ngày 1"
      },
      {
        "id": "DL26-E38889-6",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Giao chủ đầu tư không thông qua đấu giá, không thông qua",
        "clauseCount": 30,
        "content": "đấu thầu đối với trường hợp dự án đầu tư xây dựng nhà ở cho thuê đã được chấp thuận chủ trương đầu tư, chấp thuận đầu tư hoặc có văn bản pháp lý tương đương\n1. Trường hợp dự án đầu tư xây dựng nhà ở cho thuê do nhà đầu tư đề xuất đã được cơ quan có thẩm quyền chấp thuận chủ trương đầu tư, chấp thuận đầu tư hoặc có văn bản pháp lý tương đương theo quy định của pháp luật trước thời điểm Quyết định này có hiệu lực thi hành mà chưa được giao chủ đầu tư và nhà đầu tư đã đề xuất dự án đề nghị giao chủ đầu tư thì thủ tục giao chủ đầu tư thực hiện như sau:\na) Nhà đầu tư nộp hồ sơ đề nghị giao chủ đầu tư theo quy định tại điểm a, điểm b khoản 3 Điều này tại Trung tâm Phục vụ hành chính công Thành phố để Sở Xây dựng thẩm định các nội dung theo quy định tại điểm a khoản 4 Điều này;\nb) Trong thời hạn 02 ngày làm việc kể từ ngày nhận được đầy đủ hồ sơ hợp lệ của nhà đầu tư, Sở Xây dựng có trách nhiệm gửi văn bản lấy ý kiến thẩm định các cơ quan: Sở Nông nghiệp và Môi trường, Sở Tài chính và Ủy ban nhân dân cấp xã nơi có dự án;\nc) Trong thời hạn 10 ngày làm việc kể từ ngày nhận được văn bản lấy ý kiến và hồ sơ kèm theo của Sở Xây dựng, các cơ quan được lấy ý kiến thẩm định tại điểm b khoản này c"
      },
      {
        "id": "DL26-E38889-7",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Thủ tục chấp thuận chủ trương đầu tư đồng thời giao chủ đầu",
        "clauseCount": 21,
        "content": "tư đối với trường hợp dự án đầu tư xây dựng nhà ở cho thuê chưa được chấp thuận chủ trương đầu tư, chấp thuận đầu tư hoặc chưa có văn bản pháp lý tương đương\n1. Trường hợp nhà đầu tư tự đề xuất dự án khi nhà đầu tư có quyền sử dụng đất kể cả trường hợp Nhà nước cho thuê đất thu tiền thuê đất hằng năm theo quy định của pháp luật về đất đai đối với một phần hoặc toàn bộ diện tích đất của dự án hoặc nhà đầu tư đề xuất dự án chưa được công bố công khai theo quy định tại khoản 2 Điều này, phù hợp với quy hoạch đô thị và nông thôn đã được cấp có thẩm quyền phê duyệt hoặc vị trí khu đất đã được xác định để phát triển nhà ở cho thuê thì thủ tục chấp thuận chủ trương đầu tư đồng thời giao chủ đầu tư được thực hiện như sau:\na) Nhà đầu tư nộp hồ sơ chấp thuận chủ trương đầu tư đồng thời giao chủ đầu tư theo quy định tại khoản 3 Điều này tại Trung tâm Phục vụ hành chính công Thành phố;\nb) Trong thời hạn 05 ngày làm việc kể từ ngày nhận được hồ sơ hợp lệ của nhà đầu tư, Sở Xây dựng có trách nhiệm tham mưu công khai thông tin về dự án do nhà đầu tư đề xuất trên Cổng thông tin điện tử của Ủy ban nhân dân Thành phố và Cổng thông tin điện tử của Sở Xây dựng, gồm: vị trí, địa điểm, diện tích khu đất"
      },
      {
        "id": "DL26-E38889-8",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Điều chỉnh quyết định giao chủ đầu tư, quyết định chấp thuận",
        "clauseCount": 19,
        "content": "chủ trương đầu tư đồng thời giao chủ đầu tư\n1. Dự án đầu tư xây dựng nhà ở cho thuê đã được giao chủ đầu tư, chấp thuận chủ trương đầu tư đồng thời giao chủ đầu tư theo quy định của Quyết định này, trong quá trình triển khai dự án mà có thay đổi nội dung trong quyết định giao chủ đầu tư, quyết định chấp thuận chủ trương đầu tư đồng thời giao chủ đầu tư thì chủ đầu tư được tiếp tục thực hiện dự án mà không phải đề nghị cơ quan có thẩm quyền điều chỉnh nội dung dự án, trừ trường hợp quy định tại khoản 2, khoản 3 Điều này.\n2. Các trường hợp thay đổi phải thực hiện thủ tục điều chỉnh quyết định giao chủ đầu tư, điều chỉnh quyết định chấp thuận chủ trương đầu tư đồng thời giao chủ đầu tư, bao gồm:\na) Thay đổi điều kiện giao chủ đầu tư theo quy định tại khoản 1 Điều 4 của Quyết định này;\nb) Thay đổi mục tiêu đầu tư;\nc) Thay đổi quy mô diện tích đất sử dụng trên 10% hoặc trên 10 ha, thay đổi địa điểm đầu tư;\nd) Kéo dài tiến độ thực hiện dự án đầu tư mà tổng thời hạn đầu tư dự án vượt quá 12 tháng so với tiến độ thực hiện dự án đầu tư quy định tại quyết định giao chủ đầu tư, quyết định chấp thuận chủ trương đầu tư đồng thời giao chủ đầu tư;\nđ) Dự án đầu tư xây dựng nhà ở thương mại, khu đô"
      },
      {
        "id": "DL26-E38889-9",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Điều khoản chuyển tiếp",
        "clauseCount": 1,
        "content": "Dự án đầu tư xây dựng nhà ở cho thuê đã nộp hồ sơ đề nghị giao chủ đầu tư hoặc hồ sơ đề nghị chấp thuận chủ trương đầu tư đồng thời giao chủ đầu tư và đang được cơ quan có thẩm quyền xem xét, giải quyết theo quy định của pháp luật trước ngày Quyết định này có hiệu lực thi hành thì được tiếp tục thực hiện theo quy định tại thời điểm nộp hồ sơ hoặc được nhà đầu tư lựa chọn áp dụng theo quy định của Quyết định này nếu có lợi hơn, trừ trường hợp điều chỉnh Quyết định chấp thuận chủ trương đầu tư theo quy định tại Điều 7 của Quyết định này."
      },
      {
        "id": "DL26-E38889-10",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Tổ chức thực hiện",
        "clauseCount": 3,
        "content": "1. Sở Xây dựng chủ trì, phối hợp với Sở Tài chính, Sở Nông nghiệp và Môi trường, Ủy ban nhân dân cấp xã và các cơ quan liên quan hướng dẫn việc thực hiện nội dung của Quyết định này; chủ trì, phối hợp với Sở Tài chính tham mưu Ủy ban nhân dân Thành phố ban hành khung giá cho thuê nhà ở theo quy định.\n2. Những nội dung không quy định tại Quyết định này thực hiện theo quy định của pháp luật có liên quan. Trường hợp văn bản dẫn chiếu tại Quyết định này được sửa đổi, bổ sung hoặc thay thế thì áp dụng theo văn bản sửa đổi, bổ sung hoặc thay thế đó.\n3. Nhà đầu tư, chủ đầu tư: Chịu trách nhiệm trước pháp luật về tính chính xác, trung thực của hồ sơ, tài liệu đã cung cấp; thực hiện đúng nội dung dự án, cam kết đã được cơ quan có thẩm quyền chấp thuận, giao chủ đầu tư và các quy định có liên quan của Quyết định này."
      },
      {
        "id": "DL26-E38889-11",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Điều khoản thi hành",
        "clauseCount": 2,
        "content": "1. Quyết định này có hiệu lực thi hành kể từ ngày ...29/11/2026.\n2. Chánh Văn phòng Uỷ ban nhân dân Thành phố; Giám đốc các Sở, Thủ trưởng các cơ quan, đơn vị trực thuộc Ủy ban nhân dân Thành phố; Chủ tịch Ủy ban nhân dân các phường, xã và các tổ chức, cá nhân có liên quan chịu trách nhiệm thi hành Quyết định này./. Nơi nhận: - Văn phòng Chính phủ; - Các Bộ: Xây dựng, Tài chính, Tư pháp, NN&MT, Công an; - Cục Kiểm tra văn bản và Tổ chức thi hành pháp luật - Bộ Tư pháp; - Thường trực Thành ủy; - Thường trực HĐND Thành phố; - Văn phòng Thành ủy; - Văn phòng Đoàn ĐBQH, HĐND TP HN; - UB MTTQ TP - Chủ tịch UBND Thành phố; - Các đ/c PCT UBND Thành phố; - Báo và phát thanh, truyền hình Hà Nội; - Cổng thông tin điện tử Chính phủ; - Trung tâm Truyền thông, Dữ liệu và Công nghệ số thành phố Hà Nội; - VPUBTP: CVP, các PCVP, các Phòng CV; - Lưu: VT, ĐT TM. ỦY BAN NHÂN DÂN CHỦ TỊCH Vũ Đại Thắng"
      }
    ]
  },
  {
    "id": "DOC-DL26-B51811E2",
    "ssotFileName": "18523-2026_CV-CHQ_DTU_TrienKhaiTT83DaiLyHaiQuan.pdf",
    "docNumber": "18523/CHQ-GSQL",
    "docType": "CV",
    "issuer": "CHQ",
    "year": "2026",
    "issueDate": "30/06/2026",
    "effectiveDate": "30/06/2026",
    "industryGroupId": "IND-HAIQUAN",
    "subSectorCode": "HQ_FTZ",
    "subSectorLabel": "Hải quan KCN / Khu Thương mại tự do (FTZ)",
    "primaryDomain": "DTU",
    "title": "Công văn 18523/CHQ-GSQL của Cục Hải quan triển khai thực hiện Thông tư 83/2026/TT-BTC về đại lý hải quan",
    "shortSummary": "Công văn 18523/CHQ-GSQL của Cục Hải quan triển khai thực hiện Thông tư 83/2026/TT-BTC về đại lý hải quan",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "KCN",
      "FTZ"
    ],
    "secondaryDomains": [
      "DTU"
    ],
    "linkedGates": [
      "G12",
      "G16"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 4 trang",
      "LV: DTU",
      "G12",
      "G16"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_18523-2026_CV_CHQ_TrienkhaiDailyHaiQuan.pdf · 4 trang · 1.56 MB · SHA256: B51811E25DA2)",
    "nodes": [
      {
        "id": "DL26-B51811-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Công văn 18523/CHQ-GSQL của Cục Hải quan triển khai thực hiện Thông tư 83/2026/TT-BTC về đại lý hải quan",
        "clauseCount": 10,
        "content": "BỘ TÀI CHÍNH\nCỤC HẢI QUAN\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố:                   /CHQ-GSQL\nV/v triển khai thực hiện Thông tư\nsố 83/2026/TT-BTC ngày\n30/6/2026\nHà Nội, ngày         tháng       năm\nKính gửi: Các đơn vị thuộc Cục Hải quan.\nNgày 30/6/2026 Bộ trưởng Bộ Tài chính ban hành Thông tư số\n83/2026/TT-BTC quy định tiêu chuẩn hoạt động đại lý làm thủ tục hải quan; tiêu\nchuẩn nhân viên đại lý làm thủ tục hải quan; tổ chức thi, cấp chứng chỉ nghiệp vụ\nkhai hải quan; quản lý hoạt động đại lý làm thủ tục hải quan, nhân viên đại lý làm\nthủ tục hải quan; Thông tư có hiệu lực thi hành ngày 01/7/2026.\nĐể triển khai thực hiện Thông tư số 83/2026/TT-BTC ngày 30/6/2026 của\nBộ trưởng Bộ Tài chính kịp thời, đầy đủ, đúng quy định, Cục Hải quan yêu cầu\nvà phân công các đơn vị chịu trách nhiệm tổ chức thực hiện Thông tư như sau:\n1. Thủ trưởng các đơn vị tổ chức cho cán bộ, công chức trong đơn vị\nnghiên cứu kỹ và triển khai thực hiện các quy định của Thông tư số 83/2026/TT-\nBTC ngày 30/6/2026.\n2. Công khai, tuyên truyền, phổ biến về nội dung của Thông tư số\n83/2026/TT-BTC ngày 30/6/2026 cho người khai hải quan, doanh nghiệp, tổ\nchức, cá nhân biết, thực hiện."
      },
      {
        "id": "DL26-B51811-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (4 trang · 1.56 MB)",
        "clauseCount": 2,
        "content": "Tài chính quy định tiêu chuẩn hoạt động đại lý làm thủ tục hải quan; tiêu chuẩn nhân\nviên đại lý làm thủ tục hải quan; tổ chức thi, cấp chứng chỉ nghiệp vụ khai hải quan;\nquản lý hoạt động đại lý làm thủ tục hải quan, nhân viên đại lý làm thủ tục hải quan;\n4\n(2) Phụ lục một số điểm mới của Thông tư số 83/2026/TT-BTC ngày 30\ntháng 6 năm 2026 của Bộ trưởng Bộ Tài chính.\nNơi nhận:\n- Như trên;\n- Lưu: VT, GSQL (03b).\nKT. CỤC TRƯỞNG\nPHÓ CỤC TRƯỞNG\nÂu Anh Tuấn"
      }
    ]
  },
  {
    "id": "DOC-DL26-8F8C9090",
    "ssotFileName": "220-2026_ND-CP_HDXD_SuaDoiND67VeBaoHiemBatBuocHDXD.pdf",
    "docNumber": "220/2026/NĐ-CP",
    "docType": "ND",
    "issuer": "CP",
    "year": "2026",
    "issueDate": "22/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "HDXD",
    "title": "Nghị định 220/2026/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 67/2023/NĐ-CP về bảo hiểm bắt buộc",
    "shortSummary": "Nghị định 220/2026/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 67/2023/NĐ-CP về bảo hiểm bắt buộc",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 4,
    "clauseTotalCount": 10,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "HDXD"
    ],
    "linkedGates": [
      "G6",
      "G8",
      "G11",
      "G12"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 37 trang",
      "LV: HDXD",
      "G6",
      "G8",
      "G11"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_220-2026_ND_CP_BH_BaohiemtrongHDXD.pdf · 37 trang · 1.12 MB · SHA256: 8F8C9090FF35)",
    "nodes": [
      {
        "id": "DL26-8F8C90-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 21,
        "content": "Người ký: CÔNG THÔNG TIN ĐIỆN TỬ CHÍNH PHỦ\nEmail: thongtinchinhphu(øchinhphu.vn +\nCơ quan: VĂN PHÒNG CHÍNH PHÙ,\nThời gian ký: 24.06.2026 14:22:21 +07:00 lĂpi Ạ\nCHÍNH PHỦ CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố: 220/2026/NĐ-CP Hà Nội, ngày 22 tháng 6 năm 2026\nNGHỊ ĐỊNH\nSửa đỗi, bỗ sung một số điều của Nghị định SỐ 67/2023/NĐ- CP\nngày 06 tháng 9 năm 2023 của Chính phủ quy định về bảo hiểm bắt buộc\ntrách nhiệm dân sự của chủ xe cơ giới, bảo hiểm chấy, nỗ bắt buộc,\nbảo hiểm bắt buộc trong hoạt động đầu tư xây dựng\nCăn cứ Luật Tổ chức Chính phủ số 63/2025/QH15;\nCăn cứ Luật Xây dựng số 135/2025/QH15;\n- Căn cứ Luật Kinh doanh bảo hiểm số 08/2022/QH15 được sửa đổi, bỗ\nsung một số điều bởi Luật số 139/2025/QH15;\nTheo đề nghị của Bộ trưởng Bộ Tài chính;\nChính phủ ban hành Nghị định sửa đổi, bỗ sung một số điều của Nghị. định\nsố 67/2023/NĐ-CP ngày 06 tháng 9 năm 2023 của Chính phủ quy định về. bảo\nhiểm bắt buộc trách nhiệm dân sự của chủ xe cơ giới, bảo hiểm cháy, nỗ bắt\nbuộc, bảo hiểm bắt buộc trong hoạt động đâu tư xây dựng."
      },
      {
        "id": "DL26-8F8C90-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Sửa đỗi, bỗ sung Điều 32",
        "clauseCount": 3,
        "content": "“Điều 32. Đối tượng báo hiểm _ Chủ đầu tư có trách nhiệm mua bảo hiểm bắt buộc công trình trong thời gian xây dựng đôi với các công trình sau:\n1. Công trình có ảnh hưởng lớn đến an toàn, lợi ích cộng đồng theo quy định của pháp luật về xây dựng. ˆ\n2. Công trình xây dựng có nguy cơ tác động xấu đến môi trường ở mức độ cao hoặc có nguy cơ tác động xấu đến môi trường theo quy định của pháp luật về bảo vệ môi trường.\n3. Công trình quy mô lớn, kỹ thuật phức tạp theo quy định của pháp luật về xây dựng.”"
      },
      {
        "id": "DL26-8F8C90-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Sửa đôi, bỗ sung Điều 33",
        "clauseCount": 1,
        "content": "“Điều 33. Số tiền báo hiểm tối thiểu Số tiền bảo hiểm tối thiểu đối với bảo hiểm bắt buộc công trình trong thời gian xây dựng là giá trị đầy đủ của công trình khi hoàn thành, bao gồm toàn bộ vật liệu, chi phí nhân công, thiết bị lắp đặt vào công trình, cước phí vận chuyền, các loại thuế, phí khác và các hạng mục khác do chủ đầu tư cung cấp. Số tiền bảo hiểm tối thiểu đối với công trình trong thời gian xây dựng không được thấp hơn tổng giá trị hợp đồng xây dựng, kể cả giá trị điều chỉnh, bỗ sung (nếu có). Số tiền bảo hiểm tối thiểu được quy định tại Hợp đồng bảo hiểm. Trong trường hợp có thay đổi về số tiền bảo hiểm tối thiểu do điều chỉnh giá trị công trình xây dựng, bên mua bảo hiểm phải có trách nhiệm thông tin cho doanh nghiệp bảo hiểm trong vòng 05 ngày làm việc kế từ ngày điều chỉnh giá trị công trình xây dựng hoặc theo thỏa thuận tại Hợp đồng bảo hiểm.”"
      },
      {
        "id": "DL26-8F8C90-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Sứa đỗi, bố sung điểm m và điểm n khoán 2 Điều 34",
        "clauseCount": 1,
        "content": "“m) Tổn thất do hiện tượng mục rữa và diễn ra trong điều kiện áp suất, nhiệt độ bình thường.\nn) Tên thất đo hiện tượng kết tạo vậy cứng như han gỉ, đóng cặn hoặc các hiện tượng tương tự khác.”"
      },
      {
        "id": "DL26-8F8C90-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Sửa đổi, bỗ sung Điều 37",
        "clauseCount": 6,
        "content": "1. Sửa đổi, bổ sung điểm a và điểm b khoản 1 Điều 37 như sau: “1, Mức phí bảo hiểm và mức khấu trừ bảo hiểm bắt buộc công trình trong thời gian xây dựng được quy định cụ thể như sau:\na) Đối với công trình xây dựng có giá trị đưới 1.000 tỷ đồng, không bao gồm phần công việc lắp đặt thiết bị công trình và thiết bị công nghệ (sau đây gọi là lắp đặt thiết bị) hoặc có bao gồm phần lắp đặt thiết bị nhưng giá trị lắp đặt thiết bị vào công trình thấp hơn 50% tổng giá trị hạng mục công trình xây dựng được bảo hiểm: Mức phí bảo hiểm và mức khấu trừ bảo hiểm quy định tại khoản 1 Mục I Phụ lục III ban hành kèm theo Nghị định này.\nb) Đối với công trình xây dựng có giá trị đưới 1.000 tỷ đồng, có bao gồm công việc lắp đặt thiết bị và giá trị lắp đặt thiết bị chiếm từ 50% trở lên tổng giá trị hạng mục công trình xây dựng được bảo hiểm: Mức phí bảo hiểm và mức khấu trừ bảo hiểm quy định tại khoản 1 Mục II Phụ lục II ban bành kèm theo Nghị định này.”\n2. Sửa đổi, bổ sung khoản 2 Điều 37 như sau: +2, Đối với công trình xây dựng quy định tại điểm a, điểm b khoản 1 Điều này: —.. 2 GÀ Ni s lẢ Zg Tà\n2. Kết quả kinh doanh của bảo hiểm bắt buộc công trù! bínếi thối HN ỹ dựng ệ NGỚN bà Tổng số Công trình xây"
      }
    ]
  },
  {
    "id": "DOC-DL26-EF4FFD44",
    "ssotFileName": "36-2026_TT-BXD_QLCP_PhuongPhapXacDinhVaQuanLyChiPhiDTXD.pdf",
    "docNumber": "36/2026/TT-BXD",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Thông tư 36/2026/TT-BXD hướng dẫn một số nội dung, phương pháp xác định và quản lý chi phí đầu tư xây dựng",
    "shortSummary": "Thông tư 36/2026/TT-BXD hướng dẫn một số nội dung, phương pháp xác định và quản lý chi phí đầu tư xây dựng",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 16,
    "clauseTotalCount": 86,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G2",
      "G5",
      "G9",
      "G10",
      "G13",
      "G15"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 15 trang",
      "LV: QLCP",
      "G2",
      "G5",
      "G9"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_36-2026_TT_BXD_HuongDanMotSoNoiDungPhuongPhapXacDinhVaQuanLyChiPhiDauTuXayDung.pdf · 15 trang · 0.56 MB · SHA256: EF4FFD44B522)",
    "nodes": [
      {
        "id": "DL26-EF4FFD-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 20,
        "content": "BỘ XÂY DỰNG\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố: 36/2026/TT-BXD\nHà Nội, ngày 26 tháng 6 năm 2026\nTHÔNG TƯ\nHướng dẫn một số nội dung, phương pháp xác định và quản lý\nchi phí đầu tư xây dựng\nCăn cứ Luật Xây dựng số 135/2025/QH15;\nCăn cứ Nghị định số 33/2025/NĐ-CP quy định chức năng, nhiệm vụ, quyền\nhạn và cơ cấu tổ chức của Bộ Xây dựng;\nCăn cứ Nghị định số 206/2026/NĐ-CP quy định chi tiết về quản lý chi phí\nđầu tư xây dựng;\nTheo đề nghị của Cục trưởng Cục Kinh tế - Quản lý đầu tư xây dựng;\nBộ trưởng Bộ Xây dựng ban hành Thông tư hướng dẫn một số nội dung,\nphương pháp xác định và quản lý chi phí đầu tư xây dựng.\n3. Dự toán gói thầu xây dựng quy định tại khoản 3 Điều 13 Nghị định số\n206/2026/NĐ-CP được xác định theo hướng dẫn tại Mục 2 Phụ lục II Thông tư này.\n4. Điều chỉnh dự toán gói thầu thực hiện theo quy định tại khoản 8 Điều 6\nThông tư này."
      },
      {
        "id": "DL26-EF4FFD-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Phạm vi điều chỉnh",
        "clauseCount": 1,
        "content": "Thông tư này hướng dẫn một số nội dung, phương pháp xác định và quản lý chi phí đầu tư xây dựng theo quy định tại khoản 2 Điều 32 Nghị định số 206/2026/NĐ-CP ngày 15 tháng 6 năm 2026 của Chính phủ quy định chi tiết về quản lý chi phí đầu tư xây dựng gồm: sơ bộ tổng mức đầu tư xây dựng, tổng mức đầu tư xây dựng, dự toán xây dựng, định mức xây dựng, giá xây dựng, giá các yếu tố chi phí trực tiếp cấu thành giá công tác xây dựng, chỉ số giá xây dựng, chi phí quản lý dự án, chi phí tư vấn xây dựng, chi phí khác."
      },
      {
        "id": "DL26-EF4FFD-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Đối tượng áp dụng",
        "clauseCount": 1,
        "content": "Thông tư này áp dụng cho các đối tượng quy định tại Điều 2 Nghị định số 206/2026/NĐ-CP."
      },
      {
        "id": "DL26-EF4FFD-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Xác định sơ bộ tổng mức đầu tư xây dựng",
        "clauseCount": 1,
        "content": "Sơ bộ tổng mức đầu tư xây dựng được xác định theo quy định tại khoản 1, khoản 2, khoản 3 Điều 4 Nghị định số 206/2026/NĐ-CP và phương pháp hướng dẫn tại phần I Phụ lục I ban hành kèm theo Thông tư này."
      },
      {
        "id": "DL26-EF4FFD-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Xác định tổng mức đầu tư xây dựng",
        "clauseCount": 16,
        "content": "1. Tổng mức đầu tư xây dựng bao gồm các khoản mục chi phí bồi thường, hỗ trợ và tái định cư (nếu có); chi phí xây dựng; chi phí thiết bị (nếu có); chi phí quản lý dự án; chi phí tư vấn xây dựng; chi phí khác và chi phí dự phòng. Nội dung các khoản mục chi phí được quy định tại khoản 1 Điều 5 Nghị định số 206/2026/NĐ-CP và một số quy định cụ thể tại các khoản 2, 3, 4, 5, 6 và 7 Điều này.\n2. Chi phí xây dựng được quy định tại điểm b khoản 1 Điều 5 Nghị định số 206/2026/NĐ-CP gồm chi phí xây dựng các công trình, hạng mục công trình của dự án; chi phí xây dựng công trình, hạng mục công trình xây dựng tạm, phụ trợ phục vụ thi công; chi phí phá dỡ các công trình xây dựng không thuộc phạm vi của công tác phá dỡ giải phóng mặt bằng đã được xác định trong chi phí bồi thường, hỗ trợ và tái định cư. Trong đó chi phí xây dựng công trình, hạng mục công trình xây dựng tạm, phụ trợ phục vụ thi công bao gồm một hoặc một số các chi phí sau: chi phí nhà tạm để ở và điều hành thi công; chi phí kho bãi chứa vật liệu (nếu có); chi phí xây dựng nhà bao che cho máy, nền móng máy (nếu có); chi phí lắp đặt, tháo dỡ một số loại máy thi công (nếu có); chi phí công trình giao thông (cầu, đường …) phục vụ thi "
      },
      {
        "id": "DL26-EF4FFD-6",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Điều chỉnh tổng mức đầu tư xây dựng",
        "clauseCount": 6,
        "content": "1. Tổng mức đầu tư xây dựng đã phê duyệt được điều chỉnh theo quy định tại điểm b khoản 5 Điều 75 Luật Xây dựng. Việc điều chỉnh tổng mức đầu tư xây dựng thực hiện theo quy định khoản 2 Điều 10 Nghị định số 206/2026/NĐ-CP và một số quy định cụ thể tại khoản 2 Điều này.\n2. Trường hợp dự án điều chỉnh khi đã triển khai các công việc thuộc giai đoạn thực hiện dự án theo quy định tại Nghị định số 217/2026/NĐ-CP quy định chi tiết một số điều của Luật Xây dựng về quản lý hoạt động xây dựng, chủ đầu tư thực hiện xác định tổng mức đầu tư xây dựng điều chỉnh như sau:\na) Đối với công trình, gói thầu thuộc dự án không có nội dung điều chỉnh, thay đổi: Chủ đầu tư được tổng hợp dự toán xây dựng công trình đã phê duyệt (nếu có), hoặc dự toán gói thầu đã được cập nhật theo quy định (nếu có); giá trị quyết toán hợp đồng (nếu có); giá trị các chi phí thuộc khoản mục chi phí bồi thường, hỗ trợ và tái định cư đã được phê duyệt hoặc đã được quyết toán (nếu có) vào tổng mức đầu tư xây dựng điều chỉnh, bảo đảm hiệu quả đầu tư của dự án;\nb) Đối với công trình, gói thầu thuộc dự án đã phê duyệt dự toán xây dựng và có nội dung điều chỉnh, thay đổi: Chủ đầu tư xác định giá trị điều chỉnh trên cơ sở điều chỉ"
      },
      {
        "id": "DL26-EF4FFD-7",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Xác định, điều chỉnh dự toán xây dựng công trình",
        "clauseCount": 17,
        "content": "1. Dự toán xây dựng công trình được xác định theo quy định tại Điều 12 Nghị định số 206/2026/NĐ-CP và phương pháp hướng dẫn tại Mục 1 Phụ lục II Thông tư này. Các khoản mục chi phí trong dự toán xây dựng công trình gồm: chi phí xây dựng, chi phí thiết bị, chi phí quản lý dự án, chi phí tư vấn xây dựng, chi phí khác và chi phí dự phòng.\n2. Chi phí xây dựng trong dự toán xây dựng công trình được xác định theo quy định tại khoản 2 Điều 12 Nghị định số 206/2026/NĐ-CP và phương pháp hướng dẫn tại Phụ lục III Thông tư này.\n3. Chi phí thiết bị trong dự toán xây dựng công trình được xác định theo quy định tại khoản 3 Điều 12 Nghị định số 206/2026/NĐ-CP, hướng dẫn chi tiết tại khoản 2 Mục 1 Phụ lục II Thông tư này và một số quy định cụ thể sau:\na) Các khoản mục chi phí: chi phí quản lý mua sắm thiết bị (nếu có); chi phí mua bản quyền phần mềm sử dụng cho thiết bị công trình, thiết bị công nghệ (nếu có); chi phí đào tạo và chuyển giao công nghệ (nếu có); chi phí vận chuyển; chi phí bảo hiểm; thuế và các loại phí, các chi phí khác có liên quan, được xác định bằng định mức tỷ lệ (%) (nếu có) hoặc bằng cách lập dự toán hoặc căn cứ quy định do cơ quan nhà nước có thẩm quyền ban hành;\nb) Chi phí "
      },
      {
        "id": "DL26-EF4FFD-8",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Xác định, điều chỉnh dự toán gói thầu xây dựng",
        "clauseCount": 2,
        "content": "1. Dự toán gói thầu xây dựng xác định theo quy định tại Điều 13 Nghị định số 206/2026/NĐ-CP. Chủ đầu tư căn cứ vào nội dung, phạm vi, tính chất, đặc điểm, điều kiện cụ thể của từng gói thầu, xác định các khoản mục chi phí thuộc dự toán gói thầu xây dựng.\n2. Dự toán gói thầu xây dựng quy định tại khoản 2 Điều 13 Nghị định số 206/2026/NĐ-CP được cập nhật khối lượng (nếu có), giá xây dựng và các quy định khác về quản lý chi phí đầu tư xây dựng tại thời điểm xác định dự toán gói thầu. Chi phí dự phòng trong dự toán gói thầu được xác định theo hướng dẫn tại"
      },
      {
        "id": "DL26-EF4FFD-9",
        "level": "Mục",
        "code": "Mục 2",
        "title": "Phụ lục II Thông tư này.",
        "clauseCount": 0,
        "content": ""
      },
      {
        "id": "DL26-EF4FFD-10",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Xác định, điều chỉnh dự toán công việc xây dựng",
        "clauseCount": 2,
        "content": "1. Dự toán công việc xây dựng được xác định theo quy định tại Điều 14 Nghị định số 206/2026/NĐ-CP và phương pháp hướng dẫn tại Mục 3 Phụ lục II Thông tư này.\n2. Dự toán công việc xây dựng được điều chỉnh khi thay đổi về nhiệm vụ, phạm vi, nội dung công việc. Chủ đầu tư xem xét, quyết định việc điều chỉnh dự toán công việc xây dựng."
      },
      {
        "id": "DL26-EF4FFD-11",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Xác định chi phí đầu tư xây dựng đối với dự án, công trình khẩn",
        "clauseCount": 4,
        "content": "cấp, cấp bách và dự án đầu tư công đặc biệt\n1. Việc xác định sơ bộ tổng mức đầu tư xây dựng (nếu có), tổng mức đầu tư xây dựng đối với các dự án, công trình quy định tại Điều này được thực hiện phù hợp với yêu cầu triển khai dự án, mức độ chi tiết của hồ sơ thiết kế. Phương pháp xác định thực hiện theo quy định tại Phụ lục I Thông tư này.\n2. Căn cứ yêu cầu, tiến độ thực hiện và biện pháp tổ chức thi công thực tế, dự toán xây dựng được phép lập, thẩm định và phê duyệt cho toàn bộ dự án, hoặc lập cho từng dự án thành phần (nếu có), từng công trình, hạng mục, bộ phận công trình hoặc từng gói thầu xây dựng để đáp ứng yêu cầu triển khai thi công song song, đồng thời.\n3. Phương pháp xác định dự toán xây dựng thực hiện theo quy định tại Phụ lục II Thông tư này, căn cứ yêu cầu triển khai của dự án, chủ đầu tư quyết định việc lựa chọn thời điểm xác định giá làm cơ sở lập dự toán xây dựng; ưu tiên sử dụng báo giá, dữ liệu công trình tương tự và được vận dụng, điều chỉnh định mức để phù hợp với điều kiện, biện pháp thi công thực tế của dự án, công trình. Trường hợp chưa đủ cơ sở xác định một số khoản mục chi phí thì được ước tính chi phí đầu tư xây dựng. Chủ đầu tư, đơn vị tư vấn thiết kế, tư"
      },
      {
        "id": "DL26-EF4FFD-12",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Quản lý định mức xây dựng",
        "clauseCount": 3,
        "content": "1. Định mức dự toán theo quy định tại khoản 4 Điều 20 Nghị định số 206/2026/NĐ-CP do các Bộ quản lý công trình xây dựng chuyên ngành, Ủy ban nhân dân cấp tỉnh tổ chức xây dựng, rà soát và gửi hồ sơ báo cáo kết quả xác định định mức về Bộ Xây dựng theo hướng dẫn của Bộ Xây dựng tại Thông tư số 37/2026/TT-BXD ngày 26 tháng 6 năm 2026 hướng dẫn phương pháp xác định định mức dự toán và các chỉ tiêu kinh tế kỹ thuật. Đối với các định mức dự toán xây dựng do các Bộ quản lý công trình xây dựng chuyên ngành và Ủy ban nhân dân cấp tỉnh ban hành trước ngày 01 tháng 7 năm 2026, thực hiện chuyển đổi thành phần hao phí nhân công theo nhóm nhân công quy định tại Thông tư số 37/2026/TT-BXD trước ngày 01 tháng 9 năm 2026.\n2. Định mức dự toán công trình theo quy định tại điểm b, điểm c khoản 5 Điều 20 Nghị định số 206/2026/NĐ-CP do chủ đầu tư tổ chức xác định. Phương pháp xác định và hồ sơ báo cáo kết quả xác định định mức theo hướng dẫn của Bộ Xây dựng tại Thông tư số 37/2026/TT-BXD.\n3. Định mức nước ngoài quy định tại điểm d khoản 5 Điều 20 Nghị định số 206/2026/NĐ-CP do chủ đầu tư tổ chức thu thập, biên dịch, phân tích, đánh giá và đề xuất các nội dung áp dụng cho dự án theo hướng dẫn của Bộ Xây"
      },
      {
        "id": "DL26-EF4FFD-13",
        "level": "Điều",
        "code": "Điều 11",
        "title": "Quản lý giá xây dựng và giá các yếu tố chi phí trực tiếp cấu",
        "clauseCount": 15,
        "content": "thành giá công tác xây dựng\n1. Suất vốn đầu tư xây dựng, suất chi phí, giá bộ phận, đơn vị kết cấu công trình do cơ quan quản lý nhà nước công bố quy định tại các khoản 1, 2 và 3 Điều 24 Nghị định số 206/2026/NĐ-CP được tổ chức xây dựng và công bố theo định kỳ hàng năm. Phương pháp xác định suất vốn đầu tư xây dựng, suất chi phí, giá bộ phận, đơn vị kết cấu công trình theo hướng dẫn tại Thông tư số 37/2026/TT-BXD.\n2. Thông tin về giá các yếu tố chi phí trực tiếp cấu thành giá công tác xây dựng trên địa bàn tỉnh do Sở Xây dựng công bố định kỳ theo quy định tại khoản 3 Điều 24 Nghị định số 206/2026/NĐ-CP và quy định tại các khoản 3, 4 và 5 Điều này.\n3. Quản lý, công bố thông tin giá vật liệu xây dựng:\na) Giá vật liệu xây dựng là giá bình quân trong tháng của loại vật liệu theo thương hiệu, nhà sản xuất trên cơ sở giá của các đơn vị cung cấp thông tin về giá vật liệu xây dựng trên thị trường, giá do Sở Xây dựng tổ chức khảo sát, thu thập (nếu có), phù hợp với giá thị trường, tiêu chuẩn chất lượng, nguồn gốc xuất xứ. Danh mục vật liệu xây dựng công bố được lựa chọn trên cơ sở danh mục vật liệu xây dựng có trong hệ thống định mức do cơ quan có thẩm quyền ban hành và phổ biến trên địa bà"
      },
      {
        "id": "DL26-EF4FFD-14",
        "level": "Điều",
        "code": "Điều 12",
        "title": "Xác định giá xây dựng công trình",
        "clauseCount": 4,
        "content": "1. Giá xây dựng công trình là giá xây dựng được sử dụng để xác định chi phí đầu tư xây dựng công trình, gồm các loại giá xây dựng quy định tại Điều 22 Nghị định số 206/2026/NĐ-CP.\n2. Chủ đầu tư tham khảo, sử dụng giá xây dựng, giá các yếu tố chi phí trực tiếp cấu thành giá công tác xây dựng tại Điều 22 Nghị định số 206/2026/NĐ-CP và hệ thống định mức xây dựng tại Điều 19 Nghị định số 206/2026/NĐ-CP do cơ quan quản lý ban hành, công bố để xác định chi phí đầu tư xây dựng công trình đảm bảo hiệu quả, mục tiêu, tiến độ của dự án.\n3. Trường hợp giá xây dựng, giá các yếu tố chi phí trực tiếp cấu thành giá công tác xây dựng và hệ thống định mức xây dựng do cơ quan quản lý nhà nước ban hành, công bố chưa có hoặc chưa phù hợp với công trình thì chủ đầu tư, đơn vị tư vấn căn cứ hướng dẫn của Bộ Xây dựng tại Phụ lục IV Thông tư này và Thông tư số 37/2026/TT-BXD để xác định giá công tác xây dựng, giá nhóm công tác xây dựng, giá bộ phận, đơn vị kết cấu công trình, suất chi phí làm cơ sở xác định chi phí đầu tư xây dựng công trình.\n4. Chủ đầu tư gửi hồ sơ kết quả xác định giá nhân công xây dựng, giá ca máy và thiết bị thi công tại khoản 3 Điều này về Sở Xây dựng để theo dõi, quản lý. Trong quá "
      },
      {
        "id": "DL26-EF4FFD-15",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Chỉ số giá xây dựng",
        "clauseCount": 5,
        "content": "1. Chỉ số giá xây dựng do cơ quan nhà nước có thẩm quyền công bố theo quy định tại khoản 3 Điều 23 Nghị định số 206/2026/NĐ-CP phải bảo đảm kịp thời, phản ánh khách quan, phù hợp với xu hướng biến động giá của thị trường trong khoảng thời gian được lựa chọn; không tính đến chi phí bồi thường, hỗ trợ và tái định cư, lãi vay trong thời gian xây dựng, vốn lưu động ban đầu cho sản xuất kinh doanh. Đơn vị tính chỉ số giá xây dựng là phần trăm (%).\n2. Thời điểm công bố chỉ số giá xây dựng của cơ quan nhà nước có thẩm quyền:\na) Đối với các chỉ số giá xây dựng công bố theo quý, thời điểm công bố là trước ngày 15 tháng đầu quý sau. Đối với các chỉ số giá xây dựng công bố theo năm, thời điểm công bố là trước ngày 15 tháng 01 năm sau;\nb) Trường hợp cần công bố chỉ số giá xây dựng theo tháng, cơ quan nhà nước có thẩm quyền xem xét, quyết định để đáp ứng yêu cầu quản lý chi phí đầu tư xây dựng và điều chỉnh giá hợp đồng xây dựng trên địa bàn. Thời điểm công bố chỉ số giá xây dựng theo tháng là trước ngày 10 tháng sau.\n3. Căn cứ danh mục công trình, phương pháp xác định chỉ số giá xây dựng quy định tại Thông tư số 37/2026/TT-BXD, Sở Xây dựng tổ chức xác định chỉ số giá xây dựng làm cơ sở để công"
      },
      {
        "id": "DL26-EF4FFD-16",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Xác định chi phí tư vấn xây dựng",
        "clauseCount": 5,
        "content": "1. Chi phí tư vấn xây dựng quy định tại Điều 26 Nghị định số 206/2026/NĐ- CP xác định như sau:\na) Chi phí tư vấn xây dựng xác định theo định mức tỷ lệ phần trăm (%) quy định tại Thông tư ban hành định mức xây dựng;\nb) Đối với công việc tư vấn xây dựng chưa có định mức hoặc đã có định mức nhưng chưa phù hợp thì chi phí tư vấn được xác định bằng dự toán phù hợp với nội dung công việc cần thực hiện theo hướng dẫn tại phần II Phụ lục VI Thông tư này;\nc) Chi phí khảo sát xây dựng, thí nghiệm chuyên ngành xây dựng xác định bằng dự toán theo hướng dẫn tại Phụ lục V Thông tư này.\n2. Chi phí thuê tư vấn nước ngoài theo quy định tại Điều 27 Nghị định số 206/2026/NĐ-CP xác định theo hướng dẫn tại phần III Phụ lục VI Thông tư này."
      },
      {
        "id": "DL26-EF4FFD-17",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Kiểm tra việc quản lý chi phí đầu tư xây dựng",
        "clauseCount": 5,
        "content": "1. Người quyết định đầu tư tổ chức kiểm tra việc thực hiện quản lý chi phí đầu tư xây dựng của chủ đầu tư theo quy định của pháp luật. Nội dung kiểm tra bao gồm:\na) Việc thực hiện các quy định về nghĩa vụ và trách nhiệm của chủ đầu tư theo quy định của pháp luật về quản lý chi phí đầu tư xây dựng;\nb) Việc xác định, thẩm định, phê duyệt và điều chỉnh dự toán xây dựng;\nc) Việc quản lý, sử dụng chi phí dự phòng;\n2. Chi phí công tác kiểm tra của người quyết định đầu tư thuộc chi phí khác trong tổng mức đầu tư xây dựng quy định tại khoản 5 Điều 4 Thông tư này, do chủ đầu tư tổ chức lập, phê duyệt và thanh toán khi kết thúc kiểm tra."
      },
      {
        "id": "DL26-EF4FFD-18",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Hiệu lực thi hành",
        "clauseCount": 2,
        "content": "1. Thông tư này có hiệu lực thi hành từ ngày 01 tháng 7 năm 2026.\n2. Thông tư này bãi bỏ Thông tư số 11/2021/TT-BXD ngày 31 tháng 8 năm 2021 của Bộ trưởng Bộ Xây dựng về hướng dẫn một số nội dung xác định và quản lý chi phí đầu tư xây dựng; Thông tư số 14/2023/TT-BXD ngày 29 tháng 12 năm 2023 và Điều 1, Phụ lục III và Phụ lục V Thông tư số 60/2025/TT-BXD ngày 30 tháng 12 năm 2025. Nơi nhận: - Thủ tướng Chính phủ; - Các Phó Thủ tướng Chính phủ; - Các Bộ, cơ quan ngang Bộ; - Văn phòng Quốc hội; - Văn phòng Chủ tịch nước; - Văn phòng Trung ương Đảng và các Ban của Đảng; - Tòa án nhân dân tối cao; - Viện Kiểm sát nhân dân tối cao; - Kiểm toán nhà nước; - Cơ quan Trung ương của các đoàn thể; - UBND các tỉnh, thành phố trực thuộc Trung ương; - Sở Xây dựng các tỉnh, thành phố trực thuộc Trung ương; - Công báo; Cổng Thông tin điện tử Chính phủ; - Bộ Xây dựng: Bộ trưởng, các Thứ trưởng; - Các đơn vị thuộc Bộ Xây dựng; - Cổng Thông tin điện tử Bộ Xây dựng; - Cơ sở dữ liệu quốc gia về pháp luật; - Cục Kiểm tra văn bản và Tổ chức thi hành pháp luật, Bộ Tư pháp; - Lưu: VT, Cục KTQLXD. KT. BỘ TRƯỞNG THỨ TRƯỞNG Bùi Xuân Dũng DANH MỤC PHỤ LỤC (Kèm theo Thông tư số 36/2026/TT-BXD ngày 26 tháng 6 nă"
      }
    ]
  },
  {
    "id": "DOC-DL26-A904CACA",
    "ssotFileName": "37-2026_TT-BXD_QLCP_PhuongPhapXacDinhDinhMucVaChiTieuKTKT.pdf",
    "docNumber": "37/2026/TT-BXD",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Thông tư 37/2026/TT-BXD hướng dẫn phương pháp xác định định mức dự toán và các chỉ tiêu kinh tế kỹ thuật",
    "shortSummary": "Thông tư 37/2026/TT-BXD hướng dẫn phương pháp xác định định mức dự toán và các chỉ tiêu kinh tế kỹ thuật",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 4,
    "clauseTotalCount": 9,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G5",
      "G9",
      "G10"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 2 trang",
      "LV: QLCP",
      "G5",
      "G9",
      "G10"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_37-2026_TT_BXD_HuongDanPhuongPhapXacDinhDinhMucDuToanVaCacChiTieuKinhTeKyThuat.pdf · 2 trang · 0.38 MB · SHA256: A904CACAA9C5)",
    "nodes": [
      {
        "id": "DL26-A904CA-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 17,
        "content": "BỘ XÂY DỰNG\nCỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố:  37/2026/TT-BXD\nHà Nội, ngày  26   tháng  6   năm 2026\nTHÔNG TƯ\nHướng dẫn phương pháp xác định định mức dự toán và\ncác chỉ tiêu kinh tế kỹ thuật\nCăn cứ Luật Xây dựng số 135/2025/QH15;\nCăn cứ Nghị định số 206/2026/NĐ-CP của Chính phủ quy định chi tiết về\nquản lý chi phí đầu tư xây dựng;\nCăn cứ Nghị định số 33/2025/NĐ-CP của Chính phủ quy định chức năng,\nnhiệm vụ, quyền hạn và cơ cấu tổ chức của Bộ Xây dựng;\nTheo đề nghị của Cục trưởng Cục Kinh tế - Quản lý đầu tư xây dựng và\nViện trưởng Viện Kinh tế xây dựng;\nBộ trưởng Bộ Xây dựng ban hành Thông tư hướng dẫn phương pháp xác\nđịnh định mức dự toán và các chỉ tiêu kinh tế kỹ thuật."
      },
      {
        "id": "DL26-A904CA-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Ban hành kèm theo Thông tư này phương pháp xác định định mức",
        "clauseCount": 6,
        "content": "dự toán và các chỉ tiêu kinh tế kỹ thuật gồm:\n1. Phương pháp xác định định mức dự toán mới, điều chỉnh định mức dự toán và rà soát, cập nhật hệ thống định mức tại Phụ lục I;\n2. Hướng dẫn khảo sát, thu thập, công bố thông tin về giá vật liệu xây dựng tại Phụ lục II;\n3. Phương pháp xác định giá nhân công xây dựng tại Phụ lục III;\n4. Phương pháp xác định giá ca máy và thiết bị thi công xây dựng tại Phụ lục IV;\n5. Phương pháp xác định chỉ số giá xây dựng tại Phụ lục V;\n6. Phương pháp xác định suất vốn đầu tư và suất chi phí tại Phụ lục VI."
      },
      {
        "id": "DL26-A904CA-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Xử lý chuyển tiếp áp dụng giá nhân công",
        "clauseCount": 3,
        "content": "1. Trường hợp địa phương chưa kịp tổ chức thực hiện xác định giá nhân công theo phương pháp quy định tại Thông tư này, Sở Xây dựng căn cứ bảng giá nhân công đã công bố theo quy định trước đây, tổ chức chuyển đổi theo phương pháp quy định tại khoản 4 Mục I Phụ lục III Thông tư này để công bố áp dụng kể từ ngày Thông tư này có hiệu lực thi hành.\n2. Sở Xây dựng tổ chức khảo sát xác định giá nhân công theo phương pháp quy định tại Thông tư này để công bố áp dụng kể từ ngày 01 tháng 01 năm 2027.\n3. Việc xác định giá nhân công cho các công tác xây dựng trong các tập định mức dự toán xây dựng do các Bộ quản lý công trình xây dựng chuyên ngành và Ủy ban nhân dân cấp tỉnh ban hành trước ngày 01 tháng 7 năm 2026 chưa chuyển đổi sang nhóm nhân công theo quy định thì căn cứ theo tính chất công tác xây dựng để lựa chọn nhóm nhân công phù hợp theo quy định tại Bảng 3.1 Phụ lục III Thông tư này."
      },
      {
        "id": "DL26-A904CA-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Thông tư này có hiệu lực kể từ ngày 01 tháng 7 năm 2026.",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-A904CA-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Thông tư này thay thế Thông tư số 13/2021/TT-BXD ngày 31",
        "clauseCount": 1,
        "content": "tháng 8 năm 2021, Thông tư số 01/2025/TT-BXD ngày 22 tháng 01 năm 2025, Điều 12 Thông tư số 09/2025/TT-BXD ngày 13 tháng 6 năm 2025, khoản 6 Điều 1 và Điều 3 Thông tư số 60/2025/TT-BXD ngày 30 tháng 12 năm 2025 của Bộ trưởng Bộ Xây dựng./. Nơi nhận: - Thủ tướng Chính phủ; - Các Phó Thủ tướng Chính phủ; - Các Bộ, cơ quan ngang Bộ; - Văn phòng Quốc hội; - Văn phòng Chủ tịch nước; - Văn phòng Trung ương Đảng và các Ban của Đảng; - Tòa án nhân dân tối cao; - Viện Kiểm sát nhân dân tối cao; - Kiểm toán nhà nước; - Cơ quan Trung ương của các đoàn thể; - UBND các tỉnh, thành phố trực thuộc Trung ương; - Sở Xây dựng các tỉnh, thành phố trực thuộc Trung ương; - Công báo; Cổng Thông tin điện tử Chính phủ; - Bộ Xây dựng: Bộ trưởng, các Thứ trưởng; - Các đơn vị thuộc Bộ Xây dựng; - Cổng Thông tin điện tử Bộ Xây dựng; - Cơ sở dữ liệu quốc gia về pháp luật; - Cục Kiểm tra văn bản và Tổ chức thi hành pháp luật, Bộ Tư pháp; - Lưu: VT, Cục KTQLXD, Viện KTXD. KT. BỘ TRƯỞNG THỨ TRƯỞNG Bùi Xuân Dũng"
      }
    ]
  },
  {
    "id": "DOC-DL26-C0440A36",
    "ssotFileName": "38-2026_TT-BXD_QLCP_BanHanhDinhMucXayDung.pdf",
    "docNumber": "38/2026/TT-BXD",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Thông tư 38/2026/TT-BXD ban hành hệ thống định mức xây dựng (kèm 8 Phụ lục định mức)",
    "shortSummary": "Thông tư 38/2026/TT-BXD ban hành hệ thống định mức xây dựng (kèm 8 Phụ lục định mức)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 10,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G5",
      "G9",
      "G10",
      "G13"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 2 trang",
      "LV: QLCP",
      "G5",
      "G9",
      "G10"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_38-2026_TT_BXD_BanHanhDinhMucXayDung.pdf · 2 trang · 0.37 MB · SHA256: C0440A364000)",
    "nodes": [
      {
        "id": "DL26-C0440A-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 15,
        "content": "BỘ XÂY DỰNG\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố: 38/2026/TT-BXD\nHà Nội, ngày 26 tháng 6 năm 2026\nTHÔNG TƯ\nBan hành định mức xây dựng\nCăn cứ Luật Xây dựng số 135/2025/QH15;\nCăn cứ Nghị định số 33/2025/NĐ-CP của Chính phủ quy định chức năng,\nnhiệm vụ, quyền hạn và cơ cấu tổ chức của Bộ Xây dựng;\nCăn cứ Nghị định số 206/2026/NĐ-CP của Chính phủ quy định chi tiết về\nquản lý chi phí đầu tư xây dựng;\nTheo đề nghị của Cục trưởng Cục Kinh tế - Quản lý đầu tư xây dựng và Viện\ntrưởng Viện Kinh tế xây dựng;\nBộ trưởng Bộ Xây dựng ban hành Thông tư ban hành định mức xây dựng."
      },
      {
        "id": "DL26-C0440A-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Ban hành kèm theo Thông tư này các định mức xây dựng sau:",
        "clauseCount": 8,
        "content": "1. Định mức dự toán khảo sát xây dựng công trình tại Phụ lục I;\n2. Định mức dự toán xây dựng công trình tại Phụ lục II;\n3. Định mức dự toán lắp đặt hệ thống kỹ thuật của công trình tại Phụ lục III;\n4. Định mức dự toán lắp đặt máy và thiết bị công nghệ tại Phụ lục IV;\n5. Định mức dự toán thí nghiệm chuyên ngành xây dựng tại Phụ lục V;\n6. Định mức dự toán sửa chữa và bảo dưỡng công trình xây dựng tại Phụ lục VI;\n7. Định mức sử dụng vật liệu xây dựng tại Phụ lục VII;\n8. Định mức chi phí quản lý dự án và tư vấn xây dựng tại Phụ lục VIII."
      },
      {
        "id": "DL26-C0440A-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Điều khoản thi hành",
        "clauseCount": 2,
        "content": "1. Thông tư này có hiệu lực kể từ ngày 01 tháng 7 năm 2026.\n2. Thông tư này thay thế Thông tư số 12/2021/TT-BXD, Thông tư số 09/2024/TT-BXD, Thông tư số 08/2025/TT-BXD và Điều 2 Thông tư số 60/2025/TT-BXD của Bộ trưởng Bộ Xây dựng./. Nơi nhận: - Thủ tướng Chính phủ; - Các Phó Thủ tướng Chính phủ; - Các Bộ, cơ quan ngang Bộ; - Văn phòng Quốc hội; - Văn phòng Chủ tịch nước; - Văn phòng Trung ương Đảng và các Ban của Đảng; - Tòa án nhân dân tối cao; - Viện Kiểm sát nhân dân tối cao; - Kiểm toán nhà nước; - Cơ quan Trung ương của các đoàn thể; - UBND các tỉnh, thành phố trực thuộc Trung ương; - Sở Xây dựng các tỉnh, thành phố trực thuộc Trung ương; - Công báo; Cổng Thông tin điện tử Chính phủ; - Bộ Xây dựng: Bộ trưởng, các Thứ trưởng; - Các đơn vị thuộc Bộ Xây dựng; - Cổng Thông tin điện tử Bộ Xây dựng; - Cơ sở dữ liệu quốc gia về pháp luật; - Cục Kiểm tra văn bản và Tổ chức thi hành pháp luật, Bộ Tư pháp; - Lưu: VT, Cục KTQLXD, Viện KTXD. KT. BỘ TRƯỞNG THỨ TRƯỞNG Bùi Xuân Dũng"
      }
    ]
  },
  {
    "id": "DOC-DL26-F54E84F8",
    "ssotFileName": "412-2026_ND-CP_ATLD_XuPhatViPhamHanhChinhBaoVeMoiTruong.pdf",
    "docNumber": "412/2026/NĐ-CP",
    "docType": "ND",
    "issuer": "CP",
    "year": "2026",
    "issueDate": "14/11/2026",
    "effectiveDate": "01/01/2027",
    "industryGroupId": "IND-LAODONG",
    "subSectorCode": "LD_ATLD",
    "subSectorLabel": "Lao động · ATVSLĐ & Môi trường",
    "primaryDomain": "ATLD",
    "title": "Nghị định 412/2026/NĐ-CP quy định về xử phạt vi phạm hành chính trong lĩnh vực bảo vệ môi trường",
    "shortSummary": "Nghị định 412/2026/NĐ-CP quy định về xử phạt vi phạm hành chính trong lĩnh vực bảo vệ môi trường",
    "status": "Sắp có hiệu lực",
    "validityPeriod": "Sắp có hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 1,
    "clauseTotalCount": 11,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "ATLD"
    ],
    "linkedGates": [
      "G6",
      "G12",
      "G14",
      "G16"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 197 trang",
      "LV: ATLD",
      "G6",
      "G12",
      "G14"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_412-2026_ND_CP_XuphatviphamHCveMoitruong.pdf · 197 trang · 32.5 MB · SHA256: F54E84F8F456)",
    "nodes": [
      {
        "id": "DL26-F54E84-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 26,
        "content": "@® Cơ quan phát hành: VĂN PHÒNG CHÍNH PHỦ\nCHÍNH PHỦ CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n— Độc lập - Tự do - Hạnh phúc\nSố: 412/2026/NĐ-CP Hà Nội, ngày 14 tháng I1 năm 2026\nNGHỊ ĐỊNH\nQuy định về xử phạt vỉ phạm hành chính\ntrong lĩnh vực bảo vệ môi trường\nCăn cứ Luật Tô chức Chính phú số 63/2025/QH13;\nCăn cứ Luật Tổ chức chính quyên địa phương số 72/2025/QH15;\nCăn cứ Luật Bảo vệ môi trường số 72/2020/QH14 được sửa đổi, bỏ Sung\nmột số điều bởi Luật số 11/2022/QH15, Luật số 16/2023⁄QHI5, Luật\nsố 18/2023/QH15, Luật số 47/2024/QH15, Luật số 54/2024/QH15 và Luật\nsố 146/2025/QH15;\nCăn cứ Luật Xử lý vi phạm hành chính số 15/2012/QH13 được sửa đổi,\nbồ sưng một số điều bởi Luật số 54/2014/QH13, Luật số 18/201 7/QH14, Luật\nsố 67/2020/QH14, Luật số 09/2022/QH15, Luật số 11/2022/QH15, Luật số\n36/2024/QH15 và Luật số 88/2025/QH15;\nCăn cứ Luật Đa dạng sinh học số 20/2008/QI112;\n, „ Căn cứ Luật Chứng khoán số 54/2019/QH14 được sửa đổi, bổ sung một\nsố điều bởi Luật số 56/2024/QH15;\n__ Căn cứ Pháp lệnh Cảnh sát môi trường số 10/2014/ UBTVOH13 được sửa\nđôi, bô sung một số điều bởi Pháp lệnh số 09/2025/UBTVOHI5,\nTheo đê nghị của Bộ trưởng Bộ Nông nghiệp và Môi trường;\nChính phủ ban hành Nghị định quy địn"
      },
      {
        "id": "DL26-F54E84-2",
        "level": "Chương",
        "code": "Chương I",
        "title": "Chương I",
        "clauseCount": 0,
        "content": ""
      },
      {
        "id": "DL26-F54E84-3",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Phạm vi điều chỉnh",
        "clauseCount": 11,
        "content": "1. Nghị định này quy định các hành vi vi phạm hành chính, hình thức xử phạt, mức xử phạt, biện pháp khắc phục hậu quả đối với hành vi vi phạm hành chính, thâm quyên lập biên bản vi phạm hành chính, thẩm quyền xử phạt vi phạm hành chính; hành vi vi phạm hành chính đã kết thúc, hành vi vi phạm hành chính đang thực hiện: việc thi hành các hình thức xử phạt và biện pháp khắc phục hậu quả trong lĩnh vực bảo vệ môi trường.\n2. Vi phạm hành chính trong lĩnh vực bảo vệ môi trường quy định tại Nghị định này bao gôm:\na) Các hành vi vi phạm quy định về đăng ký môi trường, đánh giá tác động môi trường, giây phép môi trường:\nb) Các hành vi gây ô nhiễm môi trường:\nc) Các hành vi vi phạm quy định về quản lý chất thải; tái chế sản phẩm, bao bì và xử lý chât thải của nhà sản xuất, nhập khẩu;\nd) Các hành vi vi phạm quy định về bảo vệ môi trường của cơ sở sản xuất, kinh doanh, dịch vụ (sau đây gọi chung là cơ sở) và khu công nghiệp, khu chế xuất, khu công nghệ cao, khu công nghệ số tập trung, khu chức năng sản xuất công nghiệp của khu kinh tê (sau đây gọi chung là khu sản xuất, kinh doanh, dịch vụ tập trung), cụm công nghiệp, làng nghè;\nđ) Các hành vi vi phạm quy định về bảo vệ môi trường trong hoạt đ"
      }
    ]
  },
  {
    "id": "DOC-DL26-5CDE1F85",
    "ssotFileName": "83-2026_TT-BTC_DTU_TieuChuanDaiLyLamThuTucHaiQuan.pdf",
    "docNumber": "83/2026/TT-BTC",
    "docType": "TT",
    "issuer": "BTC",
    "year": "2026",
    "issueDate": "30/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-HAIQUAN",
    "subSectorCode": "HQ_FTZ",
    "subSectorLabel": "Hải quan KCN / Khu Thương mại tự do (FTZ)",
    "primaryDomain": "DTU",
    "title": "Thông tư 83/2026/TT-BTC quy định tiêu chuẩn hoạt động, đào tạo và quản lý đại lý làm thủ tục hải quan",
    "shortSummary": "Thông tư 83/2026/TT-BTC quy định tiêu chuẩn hoạt động, đào tạo và quản lý đại lý làm thủ tục hải quan",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 3,
    "clauseTotalCount": 16,
    "projectAxes": [
      "KCN",
      "FTZ"
    ],
    "secondaryDomains": [
      "DTU"
    ],
    "linkedGates": [
      "G12",
      "G16"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 30 trang",
      "LV: DTU",
      "G12",
      "G16"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_83-2026_TT_BTC_DailyHaiQuan.pdf · 30 trang · 7.59 MB · SHA256: 5CDE1F857C60)",
    "nodes": [
      {
        "id": "DL26-5CDE1F-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 23,
        "content": "BỘ TÀI CHÍNH CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố: 83/2026/TT-BTC Hà Nội, ngày 30 tháng 6 năm 2026\nTHÔNG TƯ\nQuy định tiêu chuẩn hoạt động đại lý làm thủ tục hải quan, tiêu chuẩn nhân\nviên đại lý làm thủ tục hải quan; tô chức thi, cấp chứng chỉ nghiệp vụ khai\nhải quan; quản lý hoạt động đại lý làm thủ tục hải quan, nhân viên đại lý\nlàm thủ tục hải quan\nCăn cứ Luật Hải quan số 54/2014/QH13 được sửa đổi, bổ sung bởi Luật\nsố 90/2025/QH15;\nCăn cứ Nghị quyết số 190/2025/QH15 của Quốc hội quy định về xử lý\nmột số vấn đề liên quan đến sắp xếp tổ chức bộ máy nhà nước;\nCăn cứ Nghị quyết số 66.18/2026/NQ-CP của Chính phủ quy định về\nphân quyên, cắt giảm, đơn giản hóa thủ tục hành chính, điều kiện kinh doanh;\nCăn cứ Nghị định số 29/2025/NĐ-CP của Chính phủ quy định chức\nnăng, nhiệm Vụ, qujên hạn và cơ cẩu tô chức của Bộ Tài chính được sửa đồi,\nbồ sung bởi Nghị định số 166/2025/NĐ-CP;\nTheo đề nghị của Cục trưởng Cục Hải quan,\nBộ trưởng Bộ Tài chính ban hành Thông tư quy định tiêu chuẩn hoạt\nđộng đại lý làm thủ tục hải quan, tiêu chuẩn nhân viên đại lý làm thủ tục hải\nquan; tổ chức thi, cấp chứng chỉ nghiệp vụ khai hải quan; quản lý hoạt động\nđại lý làm thủ tục hải q"
      },
      {
        "id": "DL26-5CDE1F-2",
        "level": "Chương",
        "code": "Chương I",
        "title": "Chương I",
        "clauseCount": 0,
        "content": ""
      },
      {
        "id": "DL26-5CDE1F-3",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Phạm vi điều chỉnh",
        "clauseCount": 1,
        "content": "Thông tư này quy định về tiêu chuẩn hoạt động đại lý làm thủ tục hải quan, tiêu chuẩn nhân viên đại ly làm thủ tục hải quan; tô chức thi, cầp chứng chỉ nghiệp vụ khai hải quan; quản ly hoạt động đại lý làm thủ tục hải quan, nhân viên đại lý làm thủ tục hải quan."
      },
      {
        "id": "DL26-5CDE1F-4",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Đối tượng áp dụng",
        "clauseCount": 6,
        "content": "1. Đại lý làm thủ tục hải quan.\n2. Nhân viên đại lý làm thủ tục hải quan.\n3. Tổ chức, cá nhân sử dụng dịch vụ đại lý làm thủ tục hải quan.\n4. Người dự thi cấp chứng chỉ nghiệp vụ khai hải quan.\n5. Công chức hải quan và cơ quan hải quan các cấp.\n6. Tổ chức, cá nhân khác có liên quan đến việc thi, cấp, quản lý chứng chỉ nghiệp vụ khai hải quan; cập nhật kiên thức của người tham gia hoạt động kinh doanh dịch vụ đại lý làm thủ tục hải quan."
      },
      {
        "id": "DL26-5CDE1F-5",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Tiêu chuẩn hoạt động đại lý làm thủ tục hải quan, tiêu chuẩn",
        "clauseCount": 10,
        "content": "nhân viên đại lý làm thủ tục hải quan\n1. Tiêu chuẩn đối với đại lý làm thủ tục hải quan:\na) Là doanh nghiệp được thành lập và đang hoạt động theo quy định của pháp luật. Người đứng tên thành lập doanh nghiệp không thuộc trường hợp quy định tại điểm g khoản 6 Điều 11 Thông tư này;\nb) Có hạ tầng công nghệ thông tin thực hiện khai hải quan điện tử, gồm: phần mềm khai hải quan, chữ ký số, internet, hệ thống máy tính để phục vụ khai hải quan điện tử và các tiêu chuẩn khác theo quy định pháp luật có liên quan;\ne) Có nhân viên đủ tiêu chuẩn là nhân viên đại lý làm thủ tục hải quan;\nd) Không thuộc danh sách đại ly làm thủ tục hải quan không được hoạt động đại lý làm thủ tục hải quan do vi phạm các quy định trong quá trình hoạt động đại lý hải quan theo quy định tại điểm c khoản 2 Điều 8 Thông tư này. 2, Tiêu chuẩn đối với nhân viên đại lý làm thủ tục hải quan:\na) Là công dân Việt Nam, đủ 18 tuổi trở lên, có đầy đủ năng lực hành vi dân sự;\nb) Có trình độ cao đẳng trở lên;\nc) Có chứng chỉ nghiệp vụ khai hải quan được cấp theo quy định tại Thông tư này. Trường hợp chứng chỉ nghiệp vụ khai hải quan quá thời hạn năm (05) năm kế từ ngày cấp thì phải hoàn thành khóa đào tạo bổ sung kiến thức pháp"
      }
    ]
  },
  {
    "id": "DOC-DL26-0D467073",
    "ssotFileName": "9947-2026_CV-BXD_QLCP_ThayThePhuLucTT36VaTT38.pdf",
    "docNumber": "9947/BXD-VPB",
    "docType": "CV",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "29/06/2026",
    "effectiveDate": "29/06/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Công văn 9947/BXD-VPB về việc thay thế phụ lục kèm theo Thông tư 36/2026/TT-BXD và Thông tư 38/2026/TT-BXD",
    "shortSummary": "Công văn 9947/BXD-VPB về việc thay thế phụ lục kèm theo Thông tư 36/2026/TT-BXD và Thông tư 38/2026/TT-BXD",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G13"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 1 trang",
      "LV: QLCP",
      "G9",
      "G13"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_9947-2026_CV_BXD_ThaythephulucTT36TT38.pdf · 1 trang · 0.29 MB · SHA256: 0D46707371D1)",
    "nodes": [
      {
        "id": "DL26-0D4670-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Công văn 9947/BXD-VPB về việc thay thế phụ lục kèm theo Thông tư 36/2026/TT-BXD và Thông tư 38/2026/TT-BXD",
        "clauseCount": 10,
        "content": "BỘ XÂY DỰNG\nSố:  9947  /BXD-VPB\nV/v thay thế phụ lục kèm theo Thông\ntư số 36/2026/TT-BXD hướng dẫn nội\ndung, phương pháp xác định và quản lý\nchi phí đầu tư xây dựng và Thông\ntư số 38/2026/TT-BXD về ban hành\nđịnh mức xây dựng\nCỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nHà Nội, ngày   29    tháng    6   năm 2026\nKính gửi: Các Cơ quan, đơn vị.\n(như nơi nhận)\nNgày 26 tháng 6 năm 2026, Bộ Xây dựng đã phát hành Thông tư số\n36/2026/TT-BXD hướng dẫn nội dung, phương pháp xác định và quản lý chi phí\nđầu tư xây dựng; Thông tư số 38/2026/TT-BXD về ban hành định mức xây dựng.\nDo sơ suất trong quá trình phát hành, Bộ Xây dựng xin gửi đến Quý cơ quan, đơn\nvị các bản Phụ lục thay thế các bản Phụ lục tương ứng đã phát hành kèm theo các\nThông tư nêu trên (gồm Phụ lục số I đến Phụ lục số VIII kèm theo Thông tư số\n38/2026/TT-BXD và Phụ lục số V kèm theo Thông tư số 36/2026/TT-BXD).\nBộ Xây dựng đề nghị Quý cơ quan, đơn vị phối hợp thực hiện./.\nNơi nhận:\n- Thủ tướng Chính phủ;\n- Các Phó Thủ tướng Chính phủ;"
      },
      {
        "id": "DL26-0D4670-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (1 trang · 0.29 MB)",
        "clauseCount": 2,
        "content": "- Sở Xây dựng các tỉnh, thành phố trực thuộc Trung ương;\n- Công báo; Cổng Thông tin điện tử Chính phủ;\n- Bộ Xây dựng: Bộ trưởng (để b/c); các Thứ trưởng;\n- Các đơn vị thuộc Bộ Xây dựng;\n- Cổng Thông tin điện tử Bộ Xây dựng;\n- Cơ sở dữ liệu quốc gia về pháp luật;\n- Cục Kiểm tra văn bản và Tổ chức thi hành pháp luật, Bộ\nTư pháp;\n- Lưu: VT, Cục KTQLXD, Viện KTXD.\nTL. BỘ TRƯỞNG\nCHÁNH VĂN PHÒNG\nLâm Văn Hoàng"
      }
    ]
  },
  {
    "id": "DOC-DL26-E450D946",
    "ssotFileName": "167-2025_ND-CP_DTU_SuaDoiND08ThuTucHaiQuan2025.pdf",
    "docNumber": "167/2025/NĐ-CP",
    "docType": "ND",
    "issuer": "CP",
    "year": "2025",
    "issueDate": "30/06/2025",
    "effectiveDate": "01/07/2025",
    "industryGroupId": "IND-HAIQUAN",
    "subSectorCode": "HQ_FTZ",
    "subSectorLabel": "Hải quan KCN / Khu Thương mại tự do (FTZ)",
    "primaryDomain": "DTU",
    "title": "Nghị định 167/2025/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 08/2015/NĐ-CP về thủ tục hải quan",
    "shortSummary": "Nghị định 167/2025/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 08/2015/NĐ-CP về thủ tục hải quan",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 14,
    "projectAxes": [
      "KCN",
      "FTZ"
    ],
    "secondaryDomains": [
      "DTU"
    ],
    "linkedGates": [
      "G0",
      "G12",
      "G16"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 78 trang",
      "LV: DTU",
      "G0",
      "G12",
      "G16"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2025]_167-2025_ND_CP_SDBS-ND082015ThutucHaiQuan.pdf · 78 trang · 3.16 MB · SHA256: E450D946D569)",
    "nodes": [
      {
        "id": "DL26-E450D9-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 29,
        "content": "Người ký: CÔNG THÔNG TIN ĐIỆN TỬ CHÍNH PHỦ\nEmail: thongtinchinhphu(ðchinhphu.vn\nCơ quan: VẤN PHONG CHÍNH PHỦ\nCHINHPHU.VNThời gian ký: ` 07.2025 16:52:24 +07: ' TT2Tˆ\nCHÍNH PHỦ CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự đo - Hạnh phúc\nSố: 167/2025/NĐ-CP Hà Nội, ngày 30 tháng 6 năm 2025\nNGHỊ ĐỊNH\nSửa đỗi, bỗ sung một số điều của Nghị định số 08/2015/NĐ- CP\nngày 21 tháng 01 năm 2015 của Chính phủ quy định chỉ tiết\nGỒNG THÓNG TN ĐIỆN TỰ GưÍNH Phủ à biện pháp thi hành Luật Hải ¡ quan về thủ tục hải quan,\n“ „ Giờ:....É........... No : kiêm tra, giám sát, kiểm soát hải quan\nNgày, G1/241925... —\nCăn cứ Luật Tổ chúc Chính phủ ngày 18 tháng 02 năm 2025;\nCăn cứ Luật Hải quan ngày 23 tháng 6 năm 2014, -\nCăn cứ Luật Thương mại ngày 14 tháng 6 năm 2005;\nCăn cứ Luật Thuế xuất khẩu, thuế nhập khẩu ngày 06 tháng 4 năm 2016;\nCăn cứ Luật Quản lý ngoại thương ngày 12 tháng 6 năm 2017,\nCăn cứ Luật Quản lý thuế ngày 13 tháng ố năm 2019;\nCăn cứ Luật Giao dịch điện tử ngày 22 tháng 6 năm 2023,\nCăn cứ Luật sửa đổi, bổ Sung một số điều của Luật Đầu thấu; Luật Đầu\ntự theo phương thức đổi tác công (ư; Luật Hải quan, Luật Thuê giá trị gia tăng,\nLuật Thuê xuất khâu, thuê nhập kháu; Luật Đâu tu; Luật Đầu tư"
      },
      {
        "id": "DL26-E450D9-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Sửa đối, bố sung một số điều của _Nghị định số 08/2015/NĐ-CP",
        "clauseCount": 9,
        "content": "ngày 21 tháng 01 năm 2015 của Chính phủ quy định chỉ tiết và biện pháp thi hành Luật Hải quan về thủ tục hải quan; kiểm tra, giám sát, kiểm soát hải quan\n1. Sửa đối, bố sung khoản 1, khoản 3 Điều 4 như sau:\na) Sửa đổi, bổ sung khoản 1 như sau: “1, Địa điểm làm thủ tục hải quan được thực hiện theo quy định tại Điều 22 Luật Hải quan. Thư, gói, kiện hàng hóa xuất khâu, nhập khẩu gửi qua dịch vụ bưu chính; hàng hóa xuất khâu, nhập khẩu gửi qua dịch vụ chuyên phát nhanh bao gồm hàng hóa thuộc danh mục hàng hóa nhập khẩu phải làm thủ tục hải quan tại cửa khẩu nhập do Thủ tướng Chính phủ ban hành quy định tại khoản 2 Điều này được làm thủ tục hải quan tại Chỉ cục Hải quan khu vực quản lý địa điểm tập kết, kiểm tra, giám sát tập trung đối với hàng bưu chính, hàng chuyển phát nhanh. Đối với hàng hóa quá cảnh gửi qua dịch vụ bưu chính, dịch vụ chuyển phát nhanh, địa điểm làm thủ tục hải quan thực hiện theo quy định tại Điều 43 Nghị định này. Đối với hàng hóa kinh doanh tạm nhập, tái xuất gửi qua dịch vụ bưu chính, dịch vụ chuyển phát nhanh, địa điểm làm thủ tục hải quan thực hiện theo quy định của pháp luật có liên quan.” _b)Sửa đổi, bỗ sung khoản 3 như sau: “3. Căn cứ vào quy hoạch và công "
      },
      {
        "id": "DL26-E450D9-3",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Điều khoắn thi hành",
        "clauseCount": 5,
        "content": "1. Hiệu lực thi hành - Nghị định này có hiệu lực thi hành từ ngày 15 tháng § năm 2025. __ Riêng các khoản 5, 6 và 19 Điều 1 Nghị định này sửa đổi, bổ sung Điều 10, Điều 11 và Điêu 35 Nghị định sô 08/2015/NĐ-CP ngày 21 tháng 01 năm 2015 của Chính phủ có hiệu lực thi hành từ ngày 01 tháng 7 năm 2025.\n2. Điều khoản chuyển tiếp Các doanh nghiệp được áp dụng chế độ ưu tiên trước thời điểm Nghị định này có hiệu lực, phải hoàn thiện điều kiện quy định tại khoản 5 Điều 1 Nghị định này sửa đổi, bô sung khoản 3 Điều 10 Nghị định số 08/2015/NĐ-CP ngày 21 tháng 01 năm 2015 của Chính phủ trong thời hạn tối đa không quá 01 năm kể từ ngày Nghị định này có hiệu lực.\n3. Nghị định này bãi bỏ Nghị định số 39/2018/NĐ-CP ngày 20 tháng 4 năm 2018 của Chính phủ sửa đổi, bổ sung một số điều của Nghị định số 08/2015/NĐ-CP ngày 21 tháng 01 năm 2015 của Chính phủ quy định chỉ tiết và biện pháp thi hành Luật Hải quan về thủ tục hải quan, kiểm tra, giám sát, kiểm soát hải quan. Nơi nhận: TM. CHÍNH PHỦ - Ban Bí thư Trung ương Đảng; : Ẻ ^ - Thủ tướng, các Phó Thủ tướng Chính phủ; &1-THỦ TƯƠNG - Các bộ, cơ quan ngang bộ, cơ quan thuộc Chính phủ; - HĐND, UBND các tỉnh, thành phố trực thuộc trung ý - Văn phòng Trun"
      }
    ]
  },
  {
    "id": "DOC-DL26-85DAF36B",
    "ssotFileName": "67-2023_ND-CP_HDXD_BaoHiemBatBuocTrongHoatDongXayDung.pdf",
    "docNumber": "67/2023/NĐ-CP",
    "docType": "ND",
    "issuer": "CP",
    "year": "2023",
    "issueDate": "06/09/2023",
    "effectiveDate": "06/09/2023",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "HDXD",
    "title": "Nghị định 67/2023/NĐ-CP quy định về bảo hiểm bắt buộc TNDS, cháy nổ và bảo hiểm trong hoạt động đầu tư xây dựng",
    "shortSummary": "Nghị định 67/2023/NĐ-CP quy định về bảo hiểm bắt buộc TNDS, cháy nổ và bảo hiểm trong hoạt động đầu tư xây dựn",
    "status": "Sửa đổi bởi NĐ 220/2026/NĐ-CP",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": true,
    "chapterCount": 1,
    "articleCount": 3,
    "clauseTotalCount": 14,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "HDXD"
    ],
    "linkedGates": [
      "G6",
      "G8",
      "G11",
      "G12"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 126 trang",
      "LV: HDXD",
      "G6",
      "G8",
      "G11"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2023]_67-2023_ND_CP_BH_BaohiemtrongHDXD.pdf · 126 trang · 5.28 MB · SHA256: 85DAF36B0811)",
    "nodes": [
      {
        "id": "DL26-85DAF3-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 30,
        "content": "*\nNgười ký: Cổng Thông tin điện tử Chính phủ\nEmail: thongin hinhphuG @ ;chinhphu: vn\n^ Cơ quan: Văn phòng Chính pl\nh CHINHPHU.vN Thời gian ký 8095023 165531 +07:00 Tẩ(1/\nCHÍNH PHỦ CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố: 67/2023/NĐ-CP Hà Nội, ngày 06 tháng 9 năm 2023\nNGHỊ ĐỊNH\nQuy định về bảo hiểm bắt buộc trách nhiệm dân sự\ncủa chủ xe cơ giới, bảo hiếm cháy, nỗ bắt buộc,\nbảo hiểm bắt buộc trong hoạt động đầu tư xây dựng\ncổno T”NG TÍN =5 NBIỆN TỦ CHÍNH PHÙ\nCăn cứ Luật TỔ chức Chính phủ ngày 19 tháng 6 năm 2015; Luật sửa đổi,\nbổ sung một số điễu của Luật Tổ chức Chính phú và Luật Tổ chức chính quyền\nđịa phương ngày 22 tháng I1 năm 2019;\nCăn cứ Bộ luật Dân sự ngày 24 tháng 11 năm 2019;\nCăn cứ Luật Kinh doanh bảo hiểm ngày 16 tháng 6 năm 2022;\nCăn cứ Luật Giao thông đường bộ ngày 13 tháng I1 năm 2008;\nCăn cứ Luật Phòng cháy và chữa chảy ngày 29 tháng 6 năm 2001; Luật\nsửa đổi, bố sung một sô điều của Luật Phòng cháy và chữa cháy ngày 22\ntháng l1 năm 2013;\nCăn cứ Luật Xây dựng ngày 18 tháng 6 năm 2014; Luật sửa đổi, bỗ sung\nmột sô điểu của Luật Xây dựng ngày 17 tháng 6 năm 2020;\nTheo đề nghị của Bộ trưởng Bộ Tài chính,\nChính phú ban hành Nghị định quy định về b"
      },
      {
        "id": "DL26-85DAF3-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Phạm vi điều chỉnh",
        "clauseCount": 3,
        "content": "Nghị định này quy định về:\n1. Điều kiện bảo hiểm, mức phí bảo hiểm, số tiền bảo hiểm tối thiểu đối với bảo hiêm bắt buộc trách nhiệm dân sự của chủ xe cơ giới, bảo hiểm cháy, nô bắt buộc, bảo hiềm bắt buộc trong hoạt động đâu tư xây dựng.\n2. Cơ chế quản lý, sử dụng Quỹ bảo hiểm xe cơ giới; mức thu, chế độ quản lý, sử dụng nguồn thu từ bảo hiểm cháy, nô bắt buộc cho hoạt động phòng cháy, chữa cháy.\n3. Trách nhiệm của các bộ, cơ quan có liên quan, bên mua bảo hiểm và doanh nghiệp bảo hiểm trong việc thực hiện bảo hiểm bắt buộc trách nhiệm dân sự của chủ xe cơ giới, bảo hiểm cháy, nỗ bắt buộc, bảo hiểm bắt buộc trong hoạt động đầu tư xây dựng."
      },
      {
        "id": "DL26-85DAF3-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Đối tượng áp dụng",
        "clauseCount": 5,
        "content": "Nghị định này áp dụng đối với:\n1. Chủ xe cơ giới tham gia giao thông, hoạt động trên lãnh thổ nước Cộng hòa xã hội chủ nghĩa Việt Nam đối với bảo hiệm bất buộc trách nhiệm dân sự của chủ xe cơ giới.\n2. Cơ quan, tổ chức và cá nhân có cơ sở có nguy hiểm về cháy, nỗ theo quy định của pháp luật phòng cháy và chữa cháy đôi với bảo hiêm cháy, nô bắt buộc.\n3. Chủ đầu tư, nhà thầu theo quy định của pháp luật xây dựng đối với bảo hiểm bắt buộc trong hoạt động đầu tư xây dựng.\n4. Doanh nghiệp bảo hiểm phi nhân thọ, chỉ nhánh doanh nghiệp bảo hiểm phi nhân thọ nước ngoài (sau đây gọi là “doanh nghiệp bảo hiểm”); doanh nghiệp tái bảo hiểm, chỉ nhánh doanh nghiệp tái bảo hiểm nước ngoài (sau đây gọi là “đoanh nghiệp tái bảo hiệm”).\n5. Cơ quan, tổ chức, cá nhân khác có liên quan đến bảo hiểm bắt buộc trách nhiệm dân sự của chủ xe cơ giới, bảo hiểm cháy, nỗ bắt buộc, bảo hiểm bắt buộc trong hoạt động đầu tư xây dựng."
      },
      {
        "id": "DL26-85DAF3-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Giải thích từ ngữ",
        "clauseCount": 6,
        "content": "Trong Nghị định này, các từ ngữ dưới đây được hiểu như sau:\n1. Chủ xe cơ giới là chủ sở hữu xe cơ giới hoặc được chủ sở hữu xe cơ giới giao chiếm hữu, sử dụng hợp pháp xe cơ giới.\n2. Xe cơ giới hoạt động là xe cơ giới đang vận hành gồm di chuyển, dừng xe, đỗ xe có sự điều khiến của chủ xe cơ giới hoặc người lái xe.\n3. Xe cơ giới tham gia giao thông là việc chủ xe cơ giới hoặc người lái xe điều khiển xe cơ giới tham gia giao thông đường bộ.\n4. Nhà thầu tư vấn là nhà thầu tư vấn khảo sát xây dựng, nhà thầu tư vấn thiết kế xây dựng của công trình xây dựng từ cập II trở lên.\n5. Người thứ ba\na) Đối với bảo hiểm bắt buộc trách nhiệm dân sự của chủ xe cơ giới: Người thứ ba là người bị thiệt hại về sức khỏe, tính mạng, tài sản đo xe cơ giới gây ra, trừ những người sau: Người lái xe, người trên xe, hành khách trên chính chiệc — Mẫu số 3 BÁO CÁO DOANH THU, BÒI THƯỜNG BẢO HIẾM BÁT BUỘC CÔNG TRÌNH TRONG HOẠT ĐỌNG ĐÀU TƯ XÂY DỰNG Tên doanh nghiệp bảo hiểm: ... Kỳ báo cáo: Năm .... Phí bảo hiểm (triệu đông) Phí bảo hiểm giữ lại Bồi thường bảo hiểm (triệu đông) Bồi thường bảo hiểm thuộc trách nhiệm giữ lại Tổng số tiền bảo hiểm (triệu £ Sö vụ Công trình xây dựng ẳn thắt tôn thã được bão hiểm (*) "
      }
    ]
  },
  {
    "id": "DOC-DL26-9DB702D8",
    "ssotFileName": "50-2022_TT-BTC_HDXD_BaoHiemTrongHoatDongXayDung.pdf",
    "docNumber": "50/2022/TT-BTC",
    "docType": "TT",
    "issuer": "BTC",
    "year": "2022",
    "issueDate": "11/08/2022",
    "effectiveDate": "01/10/2022",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "HDXD",
    "title": "Thông tư 50/2022/TT-BTC hướng dẫn bảo hiểm bắt buộc trong hoạt động đầu tư xây dựng",
    "shortSummary": "Thông tư 50/2022/TT-BTC hướng dẫn bảo hiểm bắt buộc trong hoạt động đầu tư xây dựng",
    "status": "Đã sửa đổi / Đối chiếu NĐ 67 & NĐ 220",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": true,
    "chapterCount": 1,
    "articleCount": 3,
    "clauseTotalCount": 9,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "HDXD"
    ],
    "linkedGates": [
      "G8",
      "G11",
      "G12"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 89 trang",
      "LV: HDXD",
      "G8",
      "G11",
      "G12"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2022]_50-2022_TT-BTC-BH-BaohiemtrongHDXD.pdf · 89 trang · 17.41 MB · SHA256: 9DB702D8042A)",
    "nodes": [
      {
        "id": "DL26-9DB702-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 34,
        "content": "BỘ TÀI CHÍNH CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n5 Độc lập - Tự do - Hạnh phúc\nSố: 50/2022/TT-BTC Hà Nội, ngày 11 tháng 8 năm 2022\nTHÔNG TƯ\nHướng dẫn thực hiện một số điều của Nghị định số 119/2015/NĐ-CP ngày\n13 tháng 11 năm 2015 của Chính phủ quy định bảo hiểm bắt buộc trong hoạt\nđộng đầu tư xây dựng và Nghị định SỐ 20/2022/NĐ-CP ngày 10 tháng 3\nnăm 2022 sửa đôi, bỗ sung một só điều của Nghị định số 119/2015/NĐ-CP\nngày 13 tháng II năm 2015 của Chính phủ quy định bảo hiểm\nbắt buộc trong hoạt động đầu tư xây dựng\n_Căn cứ Luật Kinh doanh bảo hiểm ngày 09 tháng 12 năm 2000; Luật\nsửa đôi, bô sung một số điêu của Luật Kinh doanh bảo hiêm ngày 24 tháng lÌ\nnăm 2010:\nCăn cứ Luật sửa đổi, bồ Sung một số điều của Luật Kinh doanh bảo\nhiệêm, Luật Sở hữu trí tuệ ngày 14 tháng 6 năm 2019;\n. Căn cứ Luật Xây dựng ngày 18 tháng 6 năm 2014; Luật sửa đổi, bỗ sung\nmột số điêu của Luật Xây dựng ngày 17 tháng 6 năm 2020;\nCăn cứ Nghị định số 87/2017/NĐ-CP ngày 26 tháng 7 năm 2017 của\nChính phủ quy định chức năng, nhiệm vụ, quyên hạn và cơ cấu tổ chức của Bộ\nTài chính;\nCăn cứ Nghị định số 119/2015/NĐ-CP ngày 13 tháng I1] năm 2015 cua\nChính phủ quy định bảo hiểm bắt buộc trong hoạt động đâu tư xây dựng;\nCăn"
      },
      {
        "id": "DL26-9DB702-2",
        "level": "Chương",
        "code": "Chương I",
        "title": "Chương I",
        "clauseCount": 0,
        "content": ""
      },
      {
        "id": "DL26-9DB702-3",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Phạm vi điều chỉnh",
        "clauseCount": 1,
        "content": "Thông tư này hướng dẫn quy tắc, điều khoản, biểu phí bảo hiểm và chế độ tài chính, chế độ báo cáo đối với bảo hiểm bắt buộc trong hoạt động đầu tư xây dựng bao gồm: Bảo hiểm bắt buộc công trình trong thời gian xây dựng; bảo hiêm bắt buộc trách nhiệm nghề nghiệp tư vấn đầu tư xây dựng; bảo hiểm bắt buộc đối với người lao động thi công trên công trường; bảo hiểm bắt buộc trách nhiệm dân sự đôi với bên thứ ba."
      },
      {
        "id": "DL26-9DB702-4",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Đối tượng áp dụng",
        "clauseCount": 5,
        "content": "Thông tư này áp dụng đối với:\n1. Chủ đầu tư, nhà thầu (trong trường hợp phí bảo hiểm công trình đã được tính vào giá hợp đông).\n2. Nhà thầu tư vắn.\n3. Nhà thầu thi công xây dựng.\n4. Doanh nghiệp bảo hiểm phi nhân thọ, chỉ nhánh doanh nghiệp bảo hiểm phi nhân thọ nước ngoài (sau đây gọi là “doanh nghiệp bảo hiểm”), doanh nghiệp tái bảo hiểm.\n5. Cơ quan, tổ chức, cá nhân khác có liên quan đến bảo hiểm bắt buộc trong hoạt động đâu tư xây dựng."
      },
      {
        "id": "DL26-9DB702-5",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Giải thích từ ngữ",
        "clauseCount": 4,
        "content": "Trong Thông tư này, các từ ngữ sau đây được hiệu như sau:\n1. Bên mua bảo hiểm là các tô chức, cá nhân sau đây:\na) Chủ đầu tư hoặc nhà thầu trong trường hợp phí bảo hiểm công trình đã được tính vào giá hợp đông xây dựng (đôi với bảo hiêm băt buộc công trình trong thời gian xây dựng). __ b) Nhà thầu tư vấn (đối với bảo hiểm bắt buộc trách nhiệm nghề nghiệp tư vân đầu tư xây dựng).\nc) Nhà thầu thi công xây dựng (đối với bảo hiểm bắt buộc cho người lao động thi công trên công trường; bảo hiêm trách nhiệm dân sự đối với bên thứ ba). ___. Nhà thầu tư ván là nhà thầu tư vấn khảo sát xây dựng, nhà thầu tư vấn thiệt kê xây dựng của công trình xây dựng từ cập II trở lên.\n3. Bên thứ ba là bên bị thiệt hại về sức khỏe, tính mạng, tài sản và quyền, lợi ích hợp pháp khác có nguyên nhân từ việc khảo sát xây dựng, thiết kế xây dựng (đối với bảo hiểm bắt buộc trách nhiệm nghề nghiệp tư vẫn đầu tư xây dựng) hoặc trong quá trình thi công xây dựng (đôi với bảo hiểm bắt buộc trách (Ban hành kèm theo Thông tư só 50/2022/TT-BTC Phụ lục VIH BÁO CÁO KẾT QUÁ KINH DOANH BẢO HIẾM BÁT BUỘC TRONG HOẠT ĐỘNG ĐÀU TƯ XÂY DỰNG ngày 11 tháng 8 năm 2022 của Bộ trưởng Bộ Tài chính) “so. ) “nh - Báo cáo năm: TỪ oossoses"
      }
    ]
  },
  {
    "id": "DOC-DL26-BE251446",
    "ssotFileName": "30-2020_ND-CP_HDXD_CongTacVanThu.pdf",
    "docNumber": "30/2020/NĐ-CP",
    "docType": "ND",
    "issuer": "CP",
    "year": "2020",
    "issueDate": "05/03/2020",
    "effectiveDate": "05/03/2020",
    "industryGroupId": "IND-TTHC",
    "subSectorCode": "TTHC_LIENTHONG",
    "subSectorLabel": "Thủ tục hành chính - liên thông",
    "primaryDomain": "HDXD",
    "title": "Nghị định 30/2020/NĐ-CP về công tác văn thư (thể thức, kỹ thuật trình bày văn bản hành chính & lưu trữ)",
    "shortSummary": "Nghị định 30/2020/NĐ-CP về công tác văn thư (thể thức, kỹ thuật trình bày văn bản hành chính & lưu trữ)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 3,
    "clauseTotalCount": 17,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "HDXD"
    ],
    "linkedGates": [
      "G0",
      "G12",
      "G16"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 76 trang",
      "LV: HDXD",
      "G0",
      "G12",
      "G16"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2020]_30-2020_ND_CP_Congtacvanthu.pdf · 76 trang · 2.89 MB · SHA256: BE2514460C95)",
    "nodes": [
      {
        "id": "DL26-BE2514-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 17,
        "content": "Ký bởi: Cổng Thông tin điện tử Chính phủ\nEmail: thongtinchinhphu@chinhphu.vn\n- Cơ quan: Văn phòng Chính phủ\n4. - — Thời gian ký: 09.03.2020 16:04:21 +07:00\nt1ờï( Œ)\nCHÍNH PHỦ CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n—— Độc lập - Tự do - Hạnh phúc\nSố: 30/2020/NĐ-CP Hà Nội, ngày 05 tháng 3 năm 2020\nCÔNG THÔNG TIN D TỦ CHÍNH PHÙ\nGi:..¿............\nĐẾN Ngày: gioi.\nNGHỊ ĐỊNH\nVề công tác văn thư\nCăn cứ Luật Tổ chức Chính phủ ngày 19 tháng 6 năm 2015;\nTheo đề nghị của Bộ trưởng Bộ Nội vụ;\nChính phủ ban hành Nghị định về công tác văn thư.\nQUY ĐỊNH CHUNG"
      },
      {
        "id": "DL26-BE2514-2",
        "level": "Chương",
        "code": "Chương I",
        "title": "Chương I",
        "clauseCount": 0,
        "content": ""
      },
      {
        "id": "DL26-BE2514-3",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Phạm vi điều chỉnh",
        "clauseCount": 1,
        "content": "Nghị định này quy định về công tác văn thư và quản lý nhà nước về công tác văn thư. Công tác văn thư được quy định tại Nghị định này bao gồm: Soạn thảo, ký ban hành văn bản; quản lý văn bản; lập hồ sơ và nộp lưu hồ sơ, tài liệu vào Lưu trữ cơ quan; quản lý và sử dụng con dấu, thiết bị lưu khóa bí mật trong công tác văn thư."
      },
      {
        "id": "DL26-BE2514-4",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Đối tượng áp dụng",
        "clauseCount": 2,
        "content": "1. Nghị định này áp dụng đối với cơ quan, tổ chức nhà nước và doanh nghiệp nhà nước (sau đây gọi chung là cơ quan, tổ chức).\n2. Tổ chức chính trị, tổ chức chính trị - xã hội, tổ chức xã hội, tổ chức xã hội - nghề nghiệp căn cứ quy định của Nghị định này và các quy định của Đảng, của pháp luật có liên quan để áp dụng cho phù hợp."
      },
      {
        "id": "DL26-BE2514-5",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Giải thích từ ngữ",
        "clauseCount": 15,
        "content": "Trong Nghị định này, những từ ngữ dưới đây được hiểu như sau:\n1. “Văn bản” là thông tin thành văn được truyền đạt. bằng ngôn ngữ hoặc ký hiệu, hình thành trong hoạt động của các cơ quan, tô chức và được trình bày đúng thê thức, kỹ thuật theo quy định.\n2. “Văn bản chuyên ngành” là văn bản hình thành trong quá trình thực hiện hoạt động chuyên môn, nghiệp vụ của một ngành, lĩnh vực do người đứng đầu cơ quan quản lý ngành, lĩnh vực quy định.\n3. “Văn bản hành chính” là văn bản hình thành trong quá trình chỉ đạo, điều hành, giải quyết công việc của các cơ quan, tổ chức.\n4. “Văn bản điện tử” là văn bản dưới dạng thông điệp dữ liệu được tạo lập hoặc được số hóa từ văn bản giấy và trình bày đúng thê thức, kỹ thuật, định dạng theo quy định.\n5. “Văn bản đi” là tất cả các loại văn bản do cơ quan, tô chức ban hành.\n6. “Văn bản đến ” là tất cả các loại văn bản do cơ quan, tô chức nhận được từ bơ quan, tổ chức, cá nhân khác gửi đến. Ị + `\n7. “Bản thảo văn bản” là bản được việt hoặc đánh máy hoặc tạo lập bắng phương tiện điện tử hình thành trong quá trình soạn thảo một văn bản của cơ quan, tô chức. §. Bản gốc văn bản” là bản hoàn chỉnh về nội dung, thể thức văn bản, được người có thâm quyền trực t"
      }
    ]
  },
  {
    "id": "DOC-DL26-7AC1B46E",
    "ssotFileName": "59-2018_ND-CP_DTU_SuaDoiND08ThuTucHaiQuan.pdf",
    "docNumber": "59/2018/NĐ-CP",
    "docType": "ND",
    "issuer": "CP",
    "year": "2018",
    "issueDate": "20/04/2018",
    "effectiveDate": "05/06/2018",
    "industryGroupId": "IND-HAIQUAN",
    "subSectorCode": "HQ_FTZ",
    "subSectorLabel": "Hải quan KCN / Khu Thương mại tự do (FTZ)",
    "primaryDomain": "DTU",
    "title": "Nghị định 59/2018/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 08/2015/NĐ-CP về thủ tục hải quan",
    "shortSummary": "Nghị định 59/2018/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 08/2015/NĐ-CP về thủ tục hải quan",
    "status": "Còn hiệu lực (SĐBS NĐ 08/2015)",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": true,
    "chapterCount": 1,
    "articleCount": 1,
    "clauseTotalCount": 4,
    "projectAxes": [
      "KCN",
      "FTZ"
    ],
    "secondaryDomains": [
      "DTU"
    ],
    "linkedGates": [
      "G0",
      "G12",
      "G16"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 48 trang",
      "LV: DTU",
      "G0",
      "G12",
      "G16"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2018]_59-2018_ND_CP_QuydinhchitietLuatHaiQuan-SDBS.pdf · 48 trang · 2.11 MB · SHA256: 7AC1B46E806A)",
    "nodes": [
      {
        "id": "DL26-7AC1B4-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 74,
        "content": "Ký bởi: Cổng Thông tin điện tử Chính phủ\nEmail: thongtinchinhphu@chinhphu.vn\nCơ quan: Văn phòng Chính phủ\nThời gian ký: 02.05.2018 10:54:34 +07:00\n[CÔNG THÔNG TIN ĐIỆN TỬ CHÍNH PHỦ]\nKi\n—— TIN ĐIỆN TỦ CHNH PÉĐ\nCHÍNH PHỦ CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố: 59/2018/NĐ-CP Hà Nội, ngày 20 tháng 4 năm 2018\nNGHỊ ĐỊNH\nSửa đổi, bỗ sung một số điều của Nghị định số 08/2015/NĐ- CP\nmày 21 tháng 01 năm 2015 của Chính phú quy định chi tiết\nì biện pháp thi hành Luật hải quan về thủ tục hải quan,\n_-A kiểm tra, giám sát, kiếm soát hải quan\nCăn cứ Luật tổ chức Chính phủ ngày 19 tháng 6 năm 2015;\nCăn cứ Luật hải quan ngày 23 tháng 6 năm 2014;\nCăn cứ Luật thuế xuất khẩu, thuế nhập khẩu ngày 06 tháng 4 năm 2016;\nTheo đề nghị của Bộ trưởng Bộ Tài chính,\nChính phủ ban hành Nghị định sửa đổi, bồ sung một số điều của Nghị\nđịnh số 08/2015/NĐ-CP ngày 21 tháng 01 năm 2015 của Chính phủ quy định\nchỉ tiết và biện pháp thi hành Luật hải quan về thủ tục hải quan, kiểm tra,\ngiám sát, kiểm soát hải quan.\nChính phủ quy định về điều kiện kinh doanh hàng miễn thuế, kho bãi, địa\nđiểm làm thủ tục hải quan, tập kết, kiểm tra, giám sát hải quan”.\n-_3. Sửa đối, bỗ sung khoản 3, khoản 4 Điều 5"
      },
      {
        "id": "DL26-7AC1B4-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Sửa đỗi, bỗ sung một số điều của Nghị định số 08/2015/NĐ-CP",
        "clauseCount": 4,
        "content": "ngày 21 tháng 01 năm 2015 của Chính phủ quy định chỉ tiết và biện pháp thi hành Luật hải quan về thủ tục hải quan, kiểm tra, giám sát, kiểm soát hải quan\n1. Bổ sung khoản 6, khoản 7 Điều 3 như sau: “6. “Kiểm tra chuyên ngành” là việc cơ quan kiểm tra chuyên ngành căn cứ các quy định về kiểm dịch thực vật, kiểm dịch động vật, tiêu chuẩn quốc gia, quy chuẩn kỹ thuật quốc gia về chất lượng hàng hóa do các cơ quan quản lý nhà nước ban hành hoặc tiêu chuẩn quôc tế hoặc các quy định pháp luật có liên quan để kiểm tra, xác định hàng hóa đủ điều kiện xuất khẩu, nhập khẩu theo quy định của pháp luật có liên quan. Hàng hóa xuất khâu, nhập khẩu kiểm tra chuyên ngành về văn hóa thực hiện theo quy định của pháp luật quản lý chuyên ngành văn hóa.\n7. “Cổng thông tin một cửa quốc gia” là một hệ thống thông tin tích hợp để thực hiện thủ tục hải quan và thủ tục hành chính của cơ quan quản lý nhà nước liên quan đến hàng hóa xuất khẩu, nhập khẩu, quá cảnh, người và phương tiện vận tải xuất cảnh, nhập cảnh, quá cảnh.” T4f (\n2. Sửa đổi, bổ sung khoản 1, khoản 3 Điều 4 như sau: “1, Địa điểm làm thủ tục hải quan được thực hiện theo quy định tại Điều 22 Luật hải quan. Thư, gói, kiện hàng hóa xuất khâu, nhậ"
      },
      {
        "id": "DL26-7AC1B4-3",
        "level": "Chương",
        "code": "Chương I",
        "title": "H Nghị định số 68/2016/NĐ-CP ngày 01 tháng 7 năm 2016 của",
        "clauseCount": 0,
        "content": ""
      }
    ]
  },
  {
    "id": "DOC-DL26-62220ABF",
    "ssotFileName": "08-2015_ND-CP_DTU_QuyDinhChiTietLuatHaiQuan.pdf",
    "docNumber": "08/2015/NĐ-CP",
    "docType": "ND",
    "issuer": "CP",
    "year": "2015",
    "issueDate": "21/01/2015",
    "effectiveDate": "15/03/2015",
    "industryGroupId": "IND-HAIQUAN",
    "subSectorCode": "HQ_FTZ",
    "subSectorLabel": "Hải quan KCN / Khu Thương mại tự do (FTZ)",
    "primaryDomain": "DTU",
    "title": "Nghị định 08/2015/NĐ-CP quy định chi tiết và biện pháp thi hành Luật Hải quan về thủ tục, kiểm tra, giám sát hải quan",
    "shortSummary": "Nghị định 08/2015/NĐ-CP quy định chi tiết và biện pháp thi hành Luật Hải quan về thủ tục, kiểm tra, giám sát h",
    "status": "Sửa đổi bởi NĐ 59/2018 & NĐ 167/2025",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": true,
    "chapterCount": 2,
    "articleCount": 7,
    "clauseTotalCount": 18,
    "projectAxes": [
      "KCN",
      "FTZ"
    ],
    "secondaryDomains": [
      "DTU"
    ],
    "linkedGates": [
      "G0",
      "G12",
      "G16"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Scan (OCR) · 87 trang",
      "LV: DTU",
      "G0",
      "G12",
      "G16"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2015]_08-2015_ND_CP_QuydinhchitietLuatHaiQuan.pdf · 87 trang · 3.31 MB · SHA256: 62220ABFCEC1)",
    "nodes": [
      {
        "id": "DL26-62220A-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 13,
        "content": "CHÍNH PHỦ CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n——— Độc lập - Tự do - Hạnh phúc\nSố: 08/2015/NĐ-CP Hà Nội, ngày 21 tháng 01 năm 2015\nNGHỊ ĐỊNH\nQuy định chỉ tiết và biện pháp thí hành Luật Hải quan\nvề thủ tục hải quan, kiểm tra, giám sát, kiểm soát hải quan\nCăn cứ Luật Tổ chúc Chính phủ ngày 25 tháng 12 năm 2001;\nCăn cứ Luật Hải quan ngày 23 tháng 6 năm 2014;\nTheo đề nghị của Bộ trưởng Bộ Tài chính,\nChính phú ban hành Nghị định quy định chỉ tiết và biện pháp thi hành\nLuật Hải quan về Ề thủ tục hải quan, kiểm tra, giảm sát, kiểm soát hải quan.\nQUY ĐỊNH CHUNG -\nĐIỀU KHOẢN THI HÀNH"
      },
      {
        "id": "DL26-62220A-2",
        "level": "Chương",
        "code": "Chương I",
        "title": "Chương I",
        "clauseCount": 0,
        "content": ""
      },
      {
        "id": "DL26-62220A-3",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Phạm vi điều chỉnh",
        "clauseCount": 1,
        "content": "Nghị định này quy định chỉ tiết một số điều và biện pháp thi hành Luật Hải quan về thủ tục hải quan, kiểm tra, giám sát hải quan và kiểm soát hải quan đối với hàng hóa xuất khẩu, nhập khẩu, quá cảnh, phương tiện vận tải xuất cảnh, nhập cảnh, quá cảnh, thông tin có liên quan đến hoạt động quản lý nhà nước về hải quan."
      },
      {
        "id": "DL26-62220A-4",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Đối tượng áp dụng",
        "clauseCount": 4,
        "content": "1. Tổ chức, cá nhân thực hiện xuất khẩu, nhập khẩu, quá cảnh hàng hóa, xuất cảnh, nhập cảnh, quá cảnh phương tiện vận tải.\n2. Tổ chức, cá nhân có quyền và nghĩa vụ liên quan đến hoạt động xuất khẩu, nhập khẩu, quá cảnh hàng hóa; xuất cảnh, nhập cảnh, quá cảnh phương tiện vận tải.\n3. Cơ quan hải quan, công chức hải quan.\n4. Cơ quan khác của Nhà nước trong việc phối hợp quản lý nhà nước về hải quan."
      },
      {
        "id": "DL26-62220A-5",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Giải thích từ ngữ",
        "clauseCount": 4,
        "content": "Trong Nghị định này, các từ ngữ dưới đây được hiểu như sau:\n1. “Thủ tục hải quan điện tử” là thủ tục hải quan trong đó việc khai, tiếp nhận, xử lý thông tín khai hải quan, trao đổi các thông tin khác theo quy định của pháp luật về thủ tục hải quan giữa các bên có liên quan thực hiện thông qua Hệ thống xử lý dữ liệu điện tử hải quan.\n2. “Hệ thống xử lý dữ liệu điện tử hải quan” là hệ thống do. Tổng cục Hải quan quản lý cho phép cơ quan hải quan thực hiện thủ tục hải quan điện tử, kết nối, trao đổi thông tin về hoạt động xuất khẩu, nhập khâu với các Bộ, ngành có liên quan.\n3. “Hệ thống khai hải quan điện tử” là hệ thống cho phép người khai hải quan thực hiện việc khai hải quan điện tử, tiếp nhận thông tin, kết quả phản hồi của cơ quan hải quan trong quá trình thực hiện thủ tục hải quan điện tử.\n4. “Tham vấn trị giá” là việc cơ quan hải quan và người khai hải quan trao đôi, cung cấp thông tin liên quan đến việc xác định trị giá hải quan đã kê khai của người khai hải quan. $. “Hàng hóa xuất khẩu, nhập khẩu thuộc đối tượng kiểm tra chuyên ngành” là hàng hóa xuất khẩu, nhập khẩu phải kiểm tra về chất lượng, y tế, văn hóa, kiểm dịch động vật, kiểm dịch thực vật, an toàn thực phẩm theo quy"
      },
      {
        "id": "DL26-62220A-6",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Địa điểm làm thủ tục hải quan",
        "clauseCount": 3,
        "content": "1. Địa điểm làm thủ tục hải quan được thực hiện theo quy định tại Điều 22 Luật Hải quan.\n2. Căn cứ tình hình xuất khẩu, nhập khẩu trong từng thời kỳ, Thủ tướng Chính phủ quyết định Danh mục hàng hóa nhập khẩu phải làm thủ tục hải quan tại cửa khẩu nhập.\n3. Căn cứ vào quy hoạch và công bố hệ thống cảng biển, cảng hàng không quốc tế, cửa khẩu đường bộ, ga đường sắt liên vận quốc tế, mạng bưu chính công cộng cung ứng dịch vụ quốc tế, Bộ trưởng Bộ Tài chính quyết định việc tổ chức bộ máy và bế trí lực lượng làm thủ tục hải quan. Căn cứ vào quy hoạch và : công bố hệ thống cảng thủy nội địa có hoạt động xuất khẩu, nhập khâu, xuất cảnh, nhập cảnh, quá cảnh; cảng xuất khẩu, nhập khẩu hàng hóa được thành lập trong nội địa; quy hoạch cảng hàng không quốc tế và kim ngạch hàng hóa xuất khẩu, nhập khâu, khối lượng công việc tại các khu vực có hoạt động xuất khẩu, nhập khẩu, xuất cảnh, nhập cảnh, quá cảnh, Bộ trưởng Bộ Tài chính quy định điều kiện, thủ tục thành lập, chấm dứt hoạt động địa điểm làm thủ tục hải quan, kho hàng không kéo dài."
      },
      {
        "id": "DL26-62220A-7",
        "level": "Điều",
        "code": "Điều 109",
        "title": "Hình thức cung cấp thông tin",
        "clauseCount": 2,
        "content": "1. Thông tin hải quan được cung cấp, trao đổi dưới dạng văn bản hoặc dữ liệu điện tử. Giá trị pháp lý của thông tin hải quan đưới dạng điện tử được quy định tại Luật Giao dịch điện tử.\n2. Việc trao đôi, cung cấp thông tỉn hải quan ở dạng điện tử được thực hiện thông qua kết nối mạng máy tính hoặc thông qua hệ thống mạng di động dưới hình thức thư điện tử hoặc tin nhắn từ các địa chỉ, sô điện thoại được cơ quan hải quan công bố chính thức."
      },
      {
        "id": "DL26-62220A-8",
        "level": "Chương",
        "code": "Chương IX",
        "title": "Chương IX",
        "clauseCount": 0,
        "content": ""
      },
      {
        "id": "DL26-62220A-9",
        "level": "Điều",
        "code": "Điều 110",
        "title": "Hiệu lực thi hành của Nghị định",
        "clauseCount": 3,
        "content": "1. Nghị định này có hiệu lực thi hành kể từ ngày 15 tháng 3 năm 2015.\n2. Nghị định này thay thế các Nghị định: số 154/2005/NĐ-CP ngày l5. tháng 12 năm 2005 quy:định chỉ tiết một số điều của Luật Hải quan về thủ tục hải quan, kiểm tra, giám ‹ sát hải quan; số 87/2012/NĐ-CP ngày 23 tháng 10 năm 2012 quy định chỉ tiết một số điều của Luật Hải quan vệ thủ tục hải quan: . điện tử đối với hàng hóa xuất khẩu, nhập khâu thương mại; số 66/2002/NĐ-CP ngày 01 tháng 7 năm 2002 quy định về định mức hành bà của người xuất cảnh, nhập cảnh và quà biếu, tặng nhập khẩu được miễn thuế; số 06/2003/NĐ-CP . ngày 22 tháng 01 năm 2003 quy định về việc phân loại hàng hóa xuất khẩu, nhập khâu; số 40/2007/NĐ-CP ngày l6 tháng 3 năm 2007 quy định về việc xác định trị giá hải quan đối với hàng hóa xuất khẩu, nhập khẩu.\n3. Bãi bỏ Khoản 2 Điều 4, Điều 6, Điều 7, Khoản 5 Điều 25, Điều 50 Nghị định số 83/2013/NĐ- CP ngày 22 tháng 7 năm 2013 của Chính phủ quy định chỉ tiết thi hành một số điều của Luật Quản lý thuế và Luật sửa đổi, bổ sung một số điều của Luật Quản lý thuế; bãi bỏ Quyết định số 65/2004/QĐ- -TIg ngày 19 tháng 4 năm 2004 của Thủ tướng Chính phủ ban hành Quy chế hoạt động của lực lượng hải quan chuyên "
      },
      {
        "id": "DL26-62220A-10",
        "level": "Điều",
        "code": "Điều 111",
        "title": "Trách nhiệm thi hành",
        "clauseCount": 2,
        "content": "1. Bộ Tài chính hướng dẫn thi hành các điều, khoản được giao tại Nghị định. bù\n2. Các Bộ trưởng, Thủ trưởng cơ quan ngang Bộ, Thủ trưởng cơ quan thuộc Chính phủ, Chủ tịch Ủy ban nhân dân tỉnh, thành phố trực thuộc Trung ương chịu trách nhiệm thi hành Nghị định này./ Nơi nhận: - Ban Bí thư Trung ương Đảng; - Thủ tướng, các Phó Thủ tướng Chính phủ; - Các Bộ, cơ quan ngang Bộ, cơ quan thuộc Chính phủ; - HĐND, UBND các tỉnh, thành phố trực thuộc Trung ươi? - Văn phòng Trung ương và các Ban của Đảng; - Văn phòng Tổng Bí thư; - Văn phòng Chủ tịch nước; - Hội đồng Dân tộc và các Ủy ban của Quốc hội; - Văn phòng Quốc hội; ~ Tòa án nhân dân tôi cao; - Viện Kiểm sát nhân dân tối cao: - Kiểm toán Nhà nước; - Ủy ban Giám sát tài chính Quốc gia; ~- Ngân hàng Chính sách xã hội; . - Ngân hàng Phát triển Việt Nam; ) - Ủy ban Trung ương Mặt trận Tổ quốc Việt Nam; : 1 - Cơ quan Trung ương của các đoàn thể; 3 - VPCP: BTCN, các PCN, Trợ lý TTg, TGĐÐ Cổng TTĐT, các Vụ, Cục, đơn vị trực thuộc, Công báo; : ị - Lưu: Văn thư, KTTH (3b).M ;40 * §7 h"
      }
    ]
  },
  {
    "id": "DOC-DL26-FA761B74",
    "ssotFileName": "1040-2026_QD-BXD_QLHD_HuongDanSuDungMauHopDong-HD.pdf",
    "docNumber": "1040/QĐ-BXD (HD)",
    "docType": "QD",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLHD",
    "title": "Hướng dẫn sử dụng, vận dụng mẫu hợp đồng xây dựng (kèm theo Quyết định 1040/QĐ-BXD)",
    "shortSummary": "Hướng dẫn sử dụng, vận dụng mẫu hợp đồng xây dựng (kèm theo Quyết định 1040/QĐ-BXD)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLHD"
    ],
    "linkedGates": [
      "G11"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 3 trang",
      "LV: QLHD",
      "Phụ lục đính kèm",
      "G11"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_1040-2026_QD_BXD_HDsudungMauHDXD.pdf · 3 trang · 0.29 MB · SHA256: FA761B741EC0)",
    "nodes": [
      {
        "id": "DL26-FA761B-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Hướng dẫn sử dụng, vận dụng mẫu hợp đồng xây dựng (kèm theo Quyết định 1040/QĐ-BXD)",
        "clauseCount": 10,
        "content": "HƯỚNG DẪN\nSỬ DỤNG, VẬN DỤNG MẪU HỢP ĐỒNG XÂY DỰNG\n(Kèm theo Quyết định số 1040/QĐ-BXD ngày 26/6/2026 của Bộ trưởng Bộ Xây dựng)\n1. Phạm vi điều chỉnh và đối tượng sử dụng\nMẫu hợp đồng xây dựng được công bố để các tổ chức, cá nhân tham khảo,\nsử dụng, vận dụng trong việc xác lập, giao kết hợp đồng xây dựng theo quy định\ntại Điều 34 Nghị định quy định chi tiết và hướng dẫn thi hành một số điều của Luật\nXây dựng về hợp đồng xây dựng.\n2. Căn cứ pháp lý xác lập Mẫu hợp đồng xây dựng\nCăn cứ Bộ Luật Dân sự số 91/2015/QH13;\nCăn cứ Luật Xây dựng số 135/2025/QH15;\nCăn cứ Nghị định số 210/2026/NĐ-CP của Chính phủ quy định chi tiết và\nhướng dẫn thi hành một số điều của Luật Xây dựng về hợp đồng xây dựng;\nCăn cứ Nghị định số 207/2026/NĐ-CP của Chính phủ quy định chi tiết một\nsố nội dung về quản lý chất lượng, thi công xây dựng và bảo trì công trình xây\ndựng;\nCăn cứ Nghị định số 217/2026/NĐ-CP của Chính phủ quy định chi tiết một\nsố điều của Luật Xây dựng về quản lý hoạt động xây dựng;\nCăn cứ Nghị định số 206/2026/NĐ-CP của Chính phủ quy định chi tiết về\nquản lý chi phí đầu tư xây dựng;\nCác căn cứ pháp lý khác.\n3. Các loại Mẫu hợp đồng xây dựng công bố bao gồm:\n3.1. Mẫu hợp đồng tư vấn lập báo cáo nghiên cứu khả thi xây dựng tại Phụ\nlục I;"
      },
      {
        "id": "DL26-FA761B-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (3 trang · 0.29 MB)",
        "clauseCount": 2,
        "content": "hợp đồng cụ thể, trường hợp các bên tham gia hợp đồng áp dụng hình thức giá hợp\nđồng khác thì phải nghiên cứu các quy định có liên quan và các hướng dẫn cụ thể\ntại các Mẫu hợp đồng để điều chỉnh các nội dung trong Mẫu hợp đồng cho phù hợp.\n5.4. Ngoài các nội dung hướng dẫn nêu trên, các bên căn cứ vào hướng dẫn\ntại điều kiện cụ thể của các mẫu hợp đồng để điều chỉnh, bổ sung nội dung các điều\nkhoản hợp đồng mẫu cho phù hợp với điều kiện cụ thể của từng gói thầu, và yêu\ncầu quản lý.\n3\n5.5. Trường hợp tại thời điểm giao kết hợp đồng xây dựng, pháp luật áp dụng\ncho hợp đồng có thay đổi, điều chỉnh thì khi sử dụng, vận dụng các mẫu hợp đồng\nxây dựng này, các tổ chức, cá nhân có liên quan phải cập nhật, điều chỉnh, bổ sung\ncác nội dung của hợp đồng cho phù hợp."
      }
    ]
  },
  {
    "id": "DOC-DL26-DD25A54F",
    "ssotFileName": "1040-2026_QD-BXD_QLHD_MauHDThiCongXayDung-PL6.pdf",
    "docNumber": "1040/QĐ-BXD (PL6)",
    "docType": "QD",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLHD",
    "title": "Phụ lục VI (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng thi công xây dựng công trình",
    "shortSummary": "Phụ lục VI (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng thi công xây dựng công trình",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 89,
    "clauseTotalCount": 62,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLHD"
    ],
    "linkedGates": [
      "G11",
      "G12",
      "G13"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 53 trang",
      "LV: QLHD",
      "Phụ lục đính kèm",
      "G11",
      "G12",
      "G13"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_1040-2026_QD_BXD_MauHopDongThiCong-PL6.pdf · 53 trang · 0.71 MB · SHA256: DD25A54F8D02)",
    "nodes": [
      {
        "id": "DL26-DD25A5-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 22,
        "content": "PHỤ LỤC VI\nMẪU HỢP ĐỒNG THI CÔNG XÂY DỰNG CÔNG TRÌNH\n(Công bố kèm theo Quyết định số 1040/QĐ-BXD ngày 26/6/2026 của\nBộ trưởng Bộ Xây dựng về việc công bố mẫu hợp đồng xây dựng)\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n---------------\n(Địa danh), ngày ... tháng ... năm ...\nHỢP ĐỒNG THI CÔNG XÂY DỰNG CÔNG TRÌNH\nSố: ……./.....(Năm) /...(ký hiệu hợp đồng)\nGói thầu (số, tên gói thầu)\nthuộc Dự án/Công trình (tên, mã định danh Dự án/Công trình)\ngiữa\n(Tên giao dịch của Bên giao thầu)\nvà\n(Tên giao dịch của Bên nhận thầu)\nMỤC LỤC\nDANH MỤC CÁC CHỮ VIẾT TẮT  .................................................................... 5\nPHẦN 1. THÔNG TIN GIAO DỊCH CỦA BÊN GIAO THẦU, BÊN NHẬN THẦU\n................................................................................................................................................ 6\nPHẦN 2. CÁC CĂN CỨ GIAO KẾT HỢP ĐỒNG  .............................................. 7\nPHẦN 3. ĐIỀU KIỆN CHUNG CỦA HỢP ĐỒNG  ............................................. 8"
      },
      {
        "id": "DL26-DD25A5-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ  ........................................................................................ 8",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên  .............................................................. 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Luật và ngôn ngữ sử dụng  ......................................................................... 10",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Thông báo  .................................................................................................. 10",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-6",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Bảo đảm thực hiện và bảo lãnh tạm ứng hợp đồng  ................................... 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-7",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung và khối lượng công việc  ............................................................ 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-8",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, kỹ thuật áp dụng; nghiệm thu và bàn giao sản",
        "clauseCount": 1,
        "content": "phẩm của hợp đồng xây dựng ................................................................................................................................. 13"
      },
      {
        "id": "DL26-DD25A5-9",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng  .................................................. 15",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-10",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng và thanh toán  ....................................................... 17",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-11",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Sửa đổi hợp đồng  ..................................................................................... 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-12",
        "level": "Điều",
        "code": "Điều 11",
        "title": "Quyền và nghĩa vụ của Bên giao thầu  ..................................................... 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-13",
        "level": "Điều",
        "code": "Điều 12",
        "title": "Quyền và nghĩa vụ của Bên nhận thầu  .................................................... 22",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-14",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Quyền và nghĩa vụ của tư vấn quản lý dự án (nếu có)  ............................ 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-15",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Quyền và nghĩa vụ của tư vấn giám sát thi công xây dựng (nếu có)  ...... 30",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-16",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ ............................................................................................ 31",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-17",
        "level": "Điều",
        "code": "Điều 16",
        "title": "An toàn lao động, bảo vệ môi trường và phòng chống cháy nổ  ............. 32",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-18",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Điện, nước và an ninh công trường  ......................................................... 33",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-19",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng hợp đồng  ................................................................................ 33",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-20",
        "level": "Điều",
        "code": "Điều 19",
        "title": "Chấm dứt hợp đồng  ................................................................................. 34",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-21",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Bảo hiểm và bảo hành  ............................................................................. 36",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-22",
        "level": "Điều",
        "code": "Điều 21",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản  .................. 37",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-23",
        "level": "Điều",
        "code": "Điều 22",
        "title": "Sự kiện bồi thường  .................................................................................. 41",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-24",
        "level": "Điều",
        "code": "Điều 23",
        "title": "Thưởng hợp đồng, phạt vi phạm hợp đồng  ............................................. 42",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-25",
        "level": "Điều",
        "code": "Điều 24",
        "title": "Khiếu nại và xử lý các tranh chấp  ........................................................... 42",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-26",
        "level": "Điều",
        "code": "Điều 25",
        "title": "Quyết toán và thanh lý hợp đồng  ............................................................ 43",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-27",
        "level": "Điều",
        "code": "Điều 26",
        "title": "Hiệu lực của hợp đồng  ............................................................................ 44",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-28",
        "level": "Điều",
        "code": "Điều 27",
        "title": "Điều khoản chung  .................................................................................... 45",
        "clauseCount": 1,
        "content": "PHẦN 4. ĐIỀU KIỆN CỤ THỂ CỦA HỢP ĐỒNG"
      },
      {
        "id": "DL26-DD25A5-29",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-30",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-31",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Luật và ngôn ngữ sử dụng",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-32",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Thông báo",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-33",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Bảo đảm thực hiện và bảo lãnh tạm ứng hợp đồng",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-34",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung và khối lượng công việc",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-DD25A5-35",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, kỹ thuật áp dụng; nghiệm thu và bàn giao sản",
        "clauseCount": 1,
        "content": "phẩm của hợp đồng xây dựng"
      },
      {
        "id": "DL26-DD25A5-36",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng",
        "clauseCount": 1,
        "content": ""
      }
    ]
  },
  {
    "id": "DOC-DL26-9F4F123D",
    "ssotFileName": "1040-2026_QD-BXD_QLHD_MauHDTuVanGiamSat-PL4.pdf",
    "docNumber": "1040/QĐ-BXD (PL4)",
    "docType": "QD",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLHD",
    "title": "Phụ lục IV (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng tư vấn giám sát thi công xây dựng",
    "shortSummary": "Phụ lục IV (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng tư vấn giám sát thi công xây dựng",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 68,
    "clauseTotalCount": 52,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLHD"
    ],
    "linkedGates": [
      "G11",
      "G12"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 30 trang",
      "LV: QLHD",
      "Phụ lục đính kèm",
      "G11",
      "G12"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_1040-2026_QD_BXD_MauHopDongGiamSat-PL4.pdf · 30 trang · 0.63 MB · SHA256: 9F4F123D78DA)",
    "nodes": [
      {
        "id": "DL26-9F4F12-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 22,
        "content": "PHỤ LỤC IV\nMẪU HỢP ĐỒNG TƯ VẤN GIÁM SÁT THI CÔNG XÂY DỰNG\n(Công bố kèm theo Quyết định số 1040/QĐ-BXD ngày 26/6/2026 của\nBộ trưởng Bộ Xây dựng về việc công bố mẫu hợp đồng xây dựng)\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n---------------\n(Địa danh), ngày …. tháng …. năm …..\nHỢP ĐỒNG XÂY DỰNG\nTư vấn giám sát thi công xây dựng\nSố: ……/(Năm) /... (Ký hiệu hợp đồng)\nGói thầu (số, tên gói thầu)\nthuộc Dự án/Công trình (tên, mã định danh Dự án/Công trình)\ngiữa\n(Tên giao dịch của Bên giao thầu )\nvà\n(Tên giao dịch của Bên nhận thầu )\nMỤC LỤC\nDANH MỤC CÁC CHỮ VIẾT TẮT ................................................................... 5\nPHẦN 1. THÔNG TIN GIAO DỊCH ................................................................... 6\nPHẦN 2. CÁC CĂN CỨ GIAO KẾT HỢP ĐỒNG ............................................. 7\nPHẦN 3. ĐIỀU KIỆN CHUNG CỦA HỢP ĐỒNG ............................................ 8"
      },
      {
        "id": "DL26-9F4F12-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ ..................................................................................... 8",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên ........................................................... 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Sử dụng các tài liệu, thông tin liên quan đến hợp đồng và bản quyền ... 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Trao đổi thông tin .................................................................................. 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-6",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Luật áp dụng và ngôn ngữ sử dụng trong hợp đồng ............................. 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-7",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung, khối lượng công việc và sản phẩm của hợp đồng ................ 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-8",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, số lượng sản phẩm .......................................... 12",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-9",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng .............................................. 12",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-10",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng, thanh toán ....................................................... 13",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-11",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Nghiệm thu sản phẩm ........................................................................... 14",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-12",
        "level": "Điều",
        "code": "Điều 11",
        "title": "Quyền, nghĩa vụ và trách nhiệm của Bên nhận thầu ............................ 15",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-13",
        "level": "Điều",
        "code": "Điều 12",
        "title": "Quyền, nghĩa vụ và trách nhiệm của Bên giao thầu ............................. 16",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-14",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Giải quyết tranh chấp, khiếu nại trong quá trình thực hiện hợp đồng .. 18",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-15",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản ............... 18",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-16",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ (nếu có) ........................................................................... 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-17",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Nhân lực của Bên nhận thầu ................................................................. 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-18",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Sửa đổi hợp đồng .................................................................................. 21",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-19",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng và chấm dứt hợp đồng ......................................................... 22",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-20",
        "level": "Điều",
        "code": "Điều 19",
        "title": "Quyết toán và thanh lý hợp đồng .......................................................... 24",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-21",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Điều khoản chung ................................................................................. 24",
        "clauseCount": 1,
        "content": "PHẦN 4. ĐIỀU KIỆN CỤ THỂ CỦA HỢP ĐỒNG .......................................... 26"
      },
      {
        "id": "DL26-9F4F12-22",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên ........................................................... 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-23",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Trao đổi thông tin ................................................................................... 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-24",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung, khối lượng công việc và sản phẩm của hợp đồng ................. 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-25",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, số lượng sản phẩm ............................................ 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-26",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng ............................................... 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-27",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng, thanh toán ........................................................ 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-28",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Nghiệm thu sản phẩm ........................................................................... 27",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-29",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Giải quyết tranh chấp, khiếu nại trong quá trình thực hiện hợp đồng . 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-30",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản ............... 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-31",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ (nếu có) .......................................................................... 29",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-32",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Nhân lực của Bên nhận thầu ................................................................. 29",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-33",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Sửa đổi hợp đồng .................................................................................. 29",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-34",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng hợp đồng ............................................................................. 30",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-9F4F12-35",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Điều khoản chung ................................................................................. 30",
        "clauseCount": 2,
        "content": "DANH MỤC CÁC CHỮ VIẾT TẮT ĐKC Điều kiện chung ĐKCT Điều kiện cụ thể HSMT Hồ sơ mời thầu HSYC Hồ sơ yêu cầu HSDT Hồ sơ dự thầu HSĐX Hồ sơ đề xuất PHẦN 1. THÔNG TIN GIAO DỊCH Hôm nay, ngày ... tháng ... năm … tại … (Địa danh), chúng tôi gồm các bên dưới đây:\n1. Bên giao thầu: Tên giao dịch: … Đại diện (hoặc người được ủy quyền) là: Ông/Bà: … Chức vụ: Địa chỉ: … Tài khoản: … Mã số thuế: … Đăng ký kinh doanh (nếu có): … Điện thoại: … Fax: … E-mail: … Và bên kia là:\n2. Bên nhận thầu: Tên giao dịch: … Đại diện (hoặc người được ủy quyền) là: Ông/Bà: … Chức vụ: Địa chỉ: … Tài khoản: … Mã số thuế: … Đăng ký kinh doanh (nếu có): … Điện thoại: … Fax: … E-mail: … [Trường hợp Bên nhận thầu là liên danh thì ghi đầy đủ thông tin như trên của các thành viên trong liên danh và cử đại diện thành viên trong liên danh giao dịch theo phân công trong thỏa thuận liên danh.] [Trường hợp các bên ủy quyền theo quy định pháp luật cho cá nhân, pháp nhân khác giao kết hợp đồng thì phải ghi rõ thông tin về giấy ủy quyền.] [Trường hợp hợp đồng xây dựng được giao dịch bằng phương thức điện tử thì phải tuân thủ pháp luật về giao dịch điện tử.] Hai bên cùng thống nhất ký hợp đồng tư vấn giám sát thi công xây dựng ("
      },
      {
        "id": "DL26-9F4F12-36",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ",
        "clauseCount": 1,
        "content": "Trong hợp đồng này, các từ ngữ dưới đây được hiểu như sau 1.1. Bên giao thầu là ... (tên giao dịch của Bên giao thầu). 1.2. Bên nhận thầu là ... (tên giao dịch của Bên nhận thầu). 1.3. Bên là Bên giao thầu hoặc Bên nhận thầu tùy theo hoàn cảnh cụ thể. 1.4. Công trình là ... (tên công trình mà Bên nhận thầu thực hiện gói thầu xây dựng theo hợp đồng này). 1.5. Dự án là dự án ... (tên dự án hoặc dự án có công trình mà Bên nhận thầu thực hiện gói thầu xây dựng theo hợp đồng này). 1.6. Đại diện Bên giao thầu là người đại diện hợp pháp theo quy định pháp luật hoặc cá nhân, pháp nhân khác được ủy quyền giao kết hợp đồng theo quy định pháp luật. 1.7. Đại diện Bên nhận thầu là người đại diện hợp pháp theo quy định pháp luật hoặc cá nhân, pháp nhân khác được ủy quyền giao kết hợp đồng theo quy định pháp luật. 1.8. Địa điểm dự án là địa điểm được nêu tại HSMT hoặc HSYC (nếu có) của Bên giao thầu; 1.9. Đơn dự thầu (nếu có) là đề xuất của Bên nhận thầu có ghi giá dự thầu để thực hiện công việc theo đúng các yêu cầu của HSMT hoặc HSYC. 1.10. Gói thầu là ... (tên gói thầu mà Bên nhận thầu thực hiện công việc xây dựng theo hợp đồng này). 1.11. Giá hợp đồng là giá trị ghi trong hợp đồng giữa Bên gi"
      }
    ]
  },
  {
    "id": "DOC-DL26-805C76AC",
    "ssotFileName": "1040-2026_QD-BXD_QLHD_MauHDTuVanKhaoSat-PL5.pdf",
    "docNumber": "1040/QĐ-BXD (PL5)",
    "docType": "QD",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLHD",
    "title": "Phụ lục V (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng tư vấn khảo sát xây dựng",
    "shortSummary": "Phụ lục V (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng tư vấn khảo sát xây dựng",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 66,
    "clauseTotalCount": 56,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLHD"
    ],
    "linkedGates": [
      "G2",
      "G11"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 29 trang",
      "LV: QLHD",
      "Phụ lục đính kèm",
      "G2",
      "G11"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_1040-2026_QD_BXD_MauHopDongKhaoSat-PL5.pdf · 29 trang · 0.59 MB · SHA256: 805C76ACAC21)",
    "nodes": [
      {
        "id": "DL26-805C76-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 21,
        "content": "PHỤ LỤC V\nMẪU HỢP ĐỒNG TƯ VẤN KHẢO SÁT XÂY DỰNG\n(Công bố kèm theo Quyết định số 1040/QĐ-BXD ngày 26/6/2026 của\nBộ trưởng Bộ Xây dựng về việc công bố mẫu hợp đồng xây dựng)\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n---------------\n(Địa danh), ngày …. tháng …. năm …..\nHỢP ĐỒNG TƯ VẤN KHẢO SÁT XÂY DỰNG\nSố: ……/(Năm) /... (Ký hiệu hợp đồng)\nGói thầu (số, tên gói thầu)\nthuộc Dự án/Công trình (tên, mã định danh Dự án/Công trình)\ngiữa\n(Tên giao dịch của Bên giao thầu)\nvà\n(Tên giao dịch của Bên nhận thầu)\nMỤC LỤC\nDANH MỤC CÁC CHỮ VIẾT TẮT ................................................................... 5\nPHẦN 1. THÔNG TIN GIAO DỊCH ................................................................... 6\nPHẦN 2. CÁC CĂN CỨ GIAO KẾT HỢP ĐỒNG ............................................. 7\nPHẦN 3. ĐIỀU KIỆN CHUNG CỦA HỢP ĐỒNG ............................................ 8"
      },
      {
        "id": "DL26-805C76-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ ..................................................................................... 8",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên ........................................................... 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Sử dụng các tài liệu, thông tin liên quan đến hợp đồng và bản quyền 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Trao đổi thông tin .................................................................................. 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-6",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Luật áp dụng và ngôn ngữ sử dụng trong hợp đồng ............................. 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-7",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung, khối lượng công việc và sản phẩm của hợp đồng ................ 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-8",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, số lượng sản phẩm .......................................... 12",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-9",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng .............................................. 13",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-10",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng, thanh toán ....................................................... 13",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-11",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Nghiệm thu sản phẩm ........................................................................... 14",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-12",
        "level": "Điều",
        "code": "Điều 11",
        "title": "Quyền, nghĩa vụ và trách nhiệm của Bên nhận thầu ............................ 15",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-13",
        "level": "Điều",
        "code": "Điều 12",
        "title": "Quyền, nghĩa vụ và trách nhiệm của Bên giao thầu ............................. 16",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-14",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Giải quyết tranh chấp, khiếu nại trong quá trình thực hiện hợp đồng .. 17",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-15",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản ............... 18",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-16",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ (nếu có) ........................................................................... 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-17",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Nhân lực của Bên nhận thầu ................................................................. 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-18",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Sửa đổi hợp đồng .................................................................................. 21",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-19",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng và chấm dứt hợp đồng ......................................................... 22",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-20",
        "level": "Điều",
        "code": "Điều 19",
        "title": "Quyết toán và thanh lý hợp đồng .......................................................... 24",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-21",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Điều khoản chung ................................................................................. 24",
        "clauseCount": 1,
        "content": "PHẦN 4. ĐIỀU KIỆN CỤ THỂ CỦA HỢP ĐỒNG .......................................... 25"
      },
      {
        "id": "DL26-805C76-22",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên ........................................................... 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-23",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Trao đổi thông tin ................................................................................... 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-24",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, số lượng sản phẩm ............................................ 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-25",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng ............................................... 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-26",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng, thanh toán ........................................................ 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-27",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Nghiệm thu sản phẩm ........................................................................... 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-28",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Giải quyết tranh chấp, khiếu nại trong quá trình thực hiện hợp đồng . 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-29",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản ............... 27",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-30",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ (nếu có) .......................................................................... 27",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-31",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Nhân lực của Bên nhận thầu ................................................................. 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-32",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Sửa đổi hợp đồng .................................................................................. 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-33",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng hợp đồng ............................................................................. 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-805C76-34",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Điều khoản chung ................................................................................. 29",
        "clauseCount": 2,
        "content": "DANH MỤC CÁC CHỮ VIẾT TẮT ĐKC Điều kiện chung ĐKCT Điều kiện cụ thể HSMT Hồ sơ mời thầu HSYC Hồ sơ yêu cầu HSDT Hồ sơ dự thầu HSĐX Hồ sơ đề xuất PHẦN 1. THÔNG TIN GIAO DỊCH Hôm nay, ngày ... tháng ... năm … tại … (Địa danh), chúng tôi gồm các bên dưới đây:\n1. Bên giao thầu: Tên giao dịch: … Đại diện (hoặc người được ủy quyền) là: Ông/Bà: … Chức vụ: Địa chỉ: … Tài khoản: … Mã số thuế: … Đăng ký kinh doanh (nếu có): … Điện thoại: … Fax: … E-mail: … Và bên kia là:\n2. Bên nhận thầu: Tên giao dịch: … Đại diện (hoặc người được ủy quyền) là: Ông/Bà: … Chức vụ: Địa chỉ: … Tài khoản: … Mã số thuế: … Đăng ký kinh doanh (nếu có): … Điện thoại: … Fax: … E-mail: … [Trường hợp Bên nhận thầu là liên danh thì ghi đầy đủ thông tin như trên của các thành viên trong liên danh và cử đại diện thành viên trong liên danh giao dịch theo phân công trong thỏa thuận liên danh.] [Trường hợp các bên ủy quyền theo quy định pháp luật cho cá nhân, pháp nhân khác giao kết hợp đồng thì phải ghi rõ thông tin về giấy ủy quyền.] [Trường hợp hợp đồng xây dựng được giao dịch bằng phương thức điện tử thì phải tuân thủ pháp luật về giao dịch điện tử.] Hai bên cùng thống nhất ký hợp đồng tư vấn khảo sát xây dựng gói thầu ("
      },
      {
        "id": "DL26-805C76-35",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ",
        "clauseCount": 1,
        "content": "Trong hợp đồng này, các từ ngữ dưới đây được hiểu như sau: 1.1. Bên giao thầu là ... (tên giao dịch của Bên giao thầu). 1.2. Bên nhận thầu là ... (tên giao dịch của Bên nhận thầu). 1.3. Bên là Bên giao thầu hoặc Bên nhận thầu tùy theo hoàn cảnh cụ thể. 1.4. Công trình là ... (tên công trình mà Bên nhận thầu thực hiện gói thầu xây dựng theo hợp đồng này). 1.5. Dự án là dự án ... (tên dự án hoặc dự án có công trình mà Bên nhận thầu thực hiện gói thầu xây dựng theo hợp đồng này). 1.6. Đại diện Bên giao thầu là người đại diện hợp pháp theo quy định pháp luật hoặc cá nhân, pháp nhân khác được ủy quyền giao kết hợp đồng theo quy định pháp luật. 1.7. Đại diện Bên nhận thầu là người đại diện hợp pháp theo quy định pháp luật hoặc cá nhân, pháp nhân khác được ủy quyền giao kết hợp đồng theo quy định pháp luật. 1.8. Đơn dự thầu (nếu có) là đề xuất của Bên nhận thầu có ghi giá dự thầu để thực hiện công việc theo đúng các yêu cầu của HSMT hoặc HSYC. 1.9. Gói thầu là ... (tên gói thầu mà Bên nhận thầu thực hiện công việc xây dựng theo hợp đồng này). 1.10. Giá hợp đồng là giá trị ghi trong hợp đồng giữa Bên giao thầu và Bên nhận thầu. Giá hợp đồng theo quy định tại Điều [Giá hợp đồng, tạm ứng, th"
      },
      {
        "id": "DL26-805C76-36",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên",
        "clauseCount": 1,
        "content": "2.1. Hồ sơ hợp đồng bao gồm các tài liệu sau: 2.1.1. Thỏa thuận hợp đồng xây dựng (nếu có); 2.1.2. Văn bản thông báo trúng thầu hoặc chỉ định thầu; 2.1.3. Đơn dự thầu; 2.1.4. Điều kiện cụ thể của hợp đồng xây dựng, điều khoản tham chiếu đối với hợp đồng; 2.1.5. Điều kiện chung của hợp đồng xây dựng; 2.1.6. Hồ sơ mời thầu hoặc hồ sơ yêu cầu của bên giao thầu; 2.1.7. Hồ sơ dự thầu hoặc hồ sơ đề xuất của Bên nhận thầu ; 2.1.8. Biên bản đàm phán hợp đồng, văn bản sửa đổi, bổ sung hợp đồng xây dựng; 2.1.9. Các phụ lục của hợp đồng xây dựng; 2.1.10. Các tài liệu khác có liên quan. 2.2. Thứ tự ưu tiên áp dụng các tài liệu của Hồ sơ hợp đồng được quy định tại [ĐKCT]."
      }
    ]
  },
  {
    "id": "DOC-DL26-B6A1CEB6",
    "ssotFileName": "1040-2026_QD-BXD_QLHD_MauHDTuVanLapBCNCKT-PL1.pdf",
    "docNumber": "1040/QĐ-BXD (PL1)",
    "docType": "QD",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLHD",
    "title": "Phụ lục I (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng tư vấn lập Báo cáo nghiên cứu khả thi (BCNCKT)",
    "shortSummary": "Phụ lục I (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng tư vấn lập Báo cáo nghiên cứu khả thi (BCNCKT)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 68,
    "clauseTotalCount": 56,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLHD"
    ],
    "linkedGates": [
      "G5",
      "G11"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 31 trang",
      "LV: QLHD",
      "Phụ lục đính kèm",
      "G5",
      "G11"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_1040-2026_QD_BXD_HDTVBaocaoNCKT-PL1.pdf · 31 trang · 0.56 MB · SHA256: B6A1CEB67C60)",
    "nodes": [
      {
        "id": "DL26-B6A1CE-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 21,
        "content": "PHỤ LỤC I\nMẪU HỢP ĐỒNG TƯ VẤN LẬP BÁO CÁO NGHIÊN CỨU KHẢ THI\n(Công bố kèm theo Quyết định số 1040/QĐ-BXD ngày 26/6/2026 của\nBộ trưởng Bộ Xây dựng về việc công bố mẫu hợp đồng xây dựng)\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n---------------\n(Địa danh), ngày …. tháng …. năm …..\nHỢP ĐỒNG TƯ VẤN LẬP BÁO CÁO NGHIÊN CỨU KHẢ THI\nSố: ……/(Năm) /... (Ký hiệu hợp đồng)\nGói thầu (số, tên gói thầu)\nthuộc Dự án/Công trình (tên, mã định danh Dự án/Công trình)\ngiữa\n(Tên giao dịch của Bên giao thầu )\nvà\n(Tên giao dịch của Bên nhận thầu )\nMỤC LỤC\nDANH MỤC CÁC TỪ VIẾT TẮT ...................................................................... 5\nPHẦN 1. THÔNG TIN GIAO DỊCH ................................................................... 6\nPHẦN 2. CÁC CĂN CỨ GIAO KẾT HỢP ĐỒNG ............................................. 7\nPHẦN 3. ĐIỀU KIỆN CHUNG CỦA HỢP ĐỒNG ............................................ 8"
      },
      {
        "id": "DL26-B6A1CE-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ ..................................................................................... 8",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên ........................................................... 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Sử dụng các tài liệu, thông tin liên quan đến hợp đồng và bản quyền 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Trao đổi thông tin .................................................................................. 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-6",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Luật áp dụng và ngôn ngữ sử dụng trong hợp đồng ............................. 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-7",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung, khối lượng công việc và sản phẩm của hợp đồng ................ 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-8",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, số lượng sản phẩm .......................................... 12",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-9",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng .............................................. 13",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-10",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng, thanh toán ....................................................... 13",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-11",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Nghiệm thu sản phẩm ........................................................................... 14",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-12",
        "level": "Điều",
        "code": "Điều 11",
        "title": "Quyền, nghĩa vụ và trách nhiệm của Bên nhận thầu ............................ 15",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-13",
        "level": "Điều",
        "code": "Điều 12",
        "title": "Quyền, nghĩa vụ và trách nhiệm của Bên giao thầu ............................. 16",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-14",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Giải quyết tranh chấp, khiếu nại trong quá trình thực hiện hợp đồng .. 18",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-15",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản ............... 18",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-16",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ (nếu có) ........................................................................... 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-17",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Nhân lực của Bên nhận thầu ................................................................. 21",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-18",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Sửa đổi hợp đồng .................................................................................. 21",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-19",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng và chấm dứt hợp đồng ......................................................... 22",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-20",
        "level": "Điều",
        "code": "Điều 19",
        "title": "Quyết toán và thanh lý hợp đồng .......................................................... 24",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-21",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Điều khoản chung ................................................................................. 24",
        "clauseCount": 1,
        "content": "PHẦN 4. ĐIỀU KIỆN CỤ THỂ CỦA HỢP ĐỒNG .......................................... 26"
      },
      {
        "id": "DL26-B6A1CE-22",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên ........................................................... 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-23",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Trao đổi thông tin ................................................................................... 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-24",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung, khối lượng công việc và sản phẩm của hợp đồng ................. 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-25",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, số lượng sản phẩm ............................................ 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-26",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng ............................................... 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-27",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng, thanh toán ........................................................ 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-28",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Nghiệm thu sản phẩm ........................................................................... 27",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-29",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Giải quyết tranh chấp, khiếu nại trong quá trình thực hiện hợp đồng . 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-30",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản ............... 29",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-31",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ (nếu có) .......................................................................... 29",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-32",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Nhân lực của Bên nhận thầu ................................................................. 29",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-33",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Sửa đổi hợp đồng .................................................................................. 30",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-34",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng hợp đồng ............................................................................. 30",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-B6A1CE-35",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Điều khoản chung ................................................................................. 31",
        "clauseCount": 2,
        "content": "DANH MỤC CÁC TỪ VIẾT TẮT ĐKC Điều kiện chung ĐKCT Điều kiện cụ thể HSMT Hồ sơ mời thầu HSYC Hồ sơ yêu cầu HSDT Hồ sơ dự thầu HSĐX Hồ sơ đề xuất PHẦN 1. THÔNG TIN GIAO DỊCH Hôm nay, ngày ... tháng ... năm … tại … (Địa danh), chúng tôi gồm các bên dưới đây:\n1. Bên giao thầu: Tên giao dịch: … Đại diện (hoặc người được ủy quyền) là: Ông/Bà: … Chức vụ: Địa chỉ: … Tài khoản: … Mã số thuế: … Đăng ký kinh doanh (nếu có): … Điện thoại: … Fax: … E-mail: … Và bên kia là:\n2. Bên nhận thầu: Tên giao dịch: … Đại diện (hoặc người được ủy quyền) là: Ông/Bà: … Chức vụ: Địa chỉ: … Tài khoản: … Mã số thuế: … Đăng ký kinh doanh (nếu có): … Điện thoại: … Fax: … E-mail: … [Trường hợp Bên nhận thầu là liên danh thì ghi đầy đủ thông tin như trên của các thành viên trong liên danh và cử đại diện thành viên trong liên danh giao dịch theo phân công trong thỏa thuận liên danh.] [Trường hợp các bên ủy quyền theo quy định pháp luật cho cá nhân, pháp nhân khác giao kết hợp đồng thì phải ghi rõ thông tin về giấy ủy quyền.] [Trường hợp hợp đồng xây dựng được giao dịch bằng phương thức điện tử thì phải tuân thủ pháp luật về giao dịch điện tử.] Hai bên cùng thống nhất ký hợp đồng tư vấn lập báo cáo nghiên cứu khả th"
      },
      {
        "id": "DL26-B6A1CE-36",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ",
        "clauseCount": 1,
        "content": "Trong hợp đồng này, các từ ngữ dưới đây được hiểu như sau 1.1. Bên giao thầu là ... (tên giao dịch của Bên giao thầu). 1.2. Bên nhận thầu là ... (tên giao dịch của Bên nhận thầu). 1.3. Bên là Bên giao thầu hoặc Bên nhận thầu tùy theo hoàn cảnh cụ thể. 1.4. Công trình là ... (tên công trình mà Bên nhận thầu thực hiện gói thầu xây dựng theo hợp đồng này). 1.5. Dự án là dự án ... (tên dự án hoặc dự án có công trình mà Bên nhận thầu thực hiện gói thầu xây dựng theo hợp đồng này). 1.6. Đại diện Bên giao thầu là người đại diện hợp pháp theo quy định pháp luật hoặc cá nhân, pháp nhân khác được ủy quyền giao kết hợp đồng theo quy định pháp luật. 1.7. Đại diện Bên nhận thầu là người đại diện hợp pháp theo quy định pháp luật hoặc cá nhân, pháp nhân khác được ủy quyền giao kết hợp đồng theo quy định pháp luật. 1.8. Đơn dự thầu (nếu có) là đề xuất của Bên nhận thầu có ghi giá dự thầu để thực hiện công việc theo đúng các yêu cầu của HSMT hoặc HSYC. 1.9. Gói thầu là ... (tên gói thầu mà Bên nhận thầu thực hiện công việc xây dựng theo hợp đồng này). 1.10. Giá hợp đồng là giá trị ghi trong hợp đồng giữa Bên giao thầu và Bên nhận thầu. Giá hợp đồng theo quy định tại Điều [Giá hợp đồng, tạm ứng, tha"
      }
    ]
  },
  {
    "id": "DOC-DL26-329464F2",
    "ssotFileName": "1040-2026_QD-BXD_QLHD_MauHDTuVanQLDA-PL3.pdf",
    "docNumber": "1040/QĐ-BXD (PL3)",
    "docType": "QD",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLHD",
    "title": "Phụ lục III (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng tư vấn quản lý dự án đầu tư xây dựng",
    "shortSummary": "Phụ lục III (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng tư vấn quản lý dự án đầu tư xây dựng",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 68,
    "clauseTotalCount": 54,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLHD"
    ],
    "linkedGates": [
      "G5",
      "G11"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 33 trang",
      "LV: QLHD",
      "Phụ lục đính kèm",
      "G5",
      "G11"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_1040-2026_QD_BXD_MauHopDongQLDA-PL3.pdf · 33 trang · 0.67 MB · SHA256: 329464F2AECB)",
    "nodes": [
      {
        "id": "DL26-329464-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 21,
        "content": "PHỤ LỤC III\nMẪU HỢP ĐỒNG TƯ VẤN QUẢN LÝ DỰ ÁN\n(Công bố kèm theo Quyết định số 1040/QĐ-BXD ngày 26/6/2026 của\nBộ trưởng Bộ Xây dựng về việc công bố mẫu hợp đồng xây dựng)\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n---------------\n(Địa danh), ngày …. tháng …. năm …..\nHỢP ĐỒNG TƯ VẤN QUẢN LÝ DỰ ÁN\nSố: ……/(Năm) /... (Ký hiệu hợp đồng)\nGói thầu (số, tên gói thầu)\nthuộc Dự án/Công trình (tên, mã định danh Dự án/Công trình)\ngiữa\n(Tên giao dịch của Bên giao thầu )\nvà\n(Tên giao dịch của Bên nhận thầu )\nMỤC LỤC\nDANH MỤC CÁC CHỮ VIẾT TẮT ................................................................... 5\nPHẦN 1. THÔNG TIN GIAO DỊCH ................................................................... 6\nPHẦN 2. CÁC CĂN CỨ GIAO KẾT HỢP ĐỒNG ............................................. 7\nPHẦN 3. ĐIỀU KIỆN CHUNG CỦA HỢP ĐỒNG ............................................ 8"
      },
      {
        "id": "DL26-329464-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ ..................................................................................... 8",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên ........................................................... 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Sử dụng các tài liệu, thông tin liên quan đến hợp đồng và bản quyền ... 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Trao đổi thông tin .................................................................................. 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-6",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Luật áp dụng và ngôn ngữ sử dụng trong hợp đồng ............................. 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-7",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung, khối lượng công việc và sản phẩm của hợp đồng ................ 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-8",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, số lượng sản phẩm .......................................... 14",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-9",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng .............................................. 14",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-10",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng, thanh toán ....................................................... 14",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-11",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Nghiệm thu sản phẩm ........................................................................... 15",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-12",
        "level": "Điều",
        "code": "Điều 11",
        "title": "Quyền, nghĩa vụ và trách nhiệm của Bên nhận thầu ............................ 16",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-13",
        "level": "Điều",
        "code": "Điều 12",
        "title": "Quyền, nghĩa vụ và trách nhiệm của Bên giao thầu ............................. 18",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-14",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Giải quyết tranh chấp, khiếu nại trong quá trình thực hiện hợp đồng .. 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-15",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản ............... 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-16",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ (nếu có) ........................................................................... 22",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-17",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Nhân lực của Bên nhận thầu ................................................................. 23",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-18",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Sửa đổi hợp đồng .................................................................................. 23",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-19",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng và chấm dứt hợp đồng ......................................................... 24",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-20",
        "level": "Điều",
        "code": "Điều 19",
        "title": "Quyết toán và thanh lý hợp đồng .......................................................... 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-21",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Điều khoản chung ................................................................................. 26",
        "clauseCount": 1,
        "content": "PHẦN 4. ĐIỀU KIỆN CỤ THỂ CỦA HỢP ĐỒNG .......................................... 28"
      },
      {
        "id": "DL26-329464-22",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên ........................................................... 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-23",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Trao đổi thông tin ................................................................................... 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-24",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung, khối lượng công việc và sản phẩm của hợp đồng ................. 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-25",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, số lượng sản phẩm ............................................ 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-26",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng ............................................... 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-27",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng, thanh toán ........................................................ 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-28",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Nghiệm thu sản phẩm ........................................................................... 29",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-29",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Giải quyết tranh chấp, khiếu nại trong quá trình thực hiện hợp đồng . 29",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-30",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản ............... 30",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-31",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ (nếu có) .......................................................................... 30",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-32",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Nhân lực của Bên nhận thầu ................................................................. 31",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-33",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Sửa đổi hợp đồng .................................................................................. 31",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-34",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng hợp đồng ............................................................................. 32",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-329464-35",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Điều khoản chung ................................................................................. 32",
        "clauseCount": 2,
        "content": "DANH MỤC CÁC CHỮ VIẾT TẮT ĐKC Điều kiện chung ĐKCT Điều kiện cụ thể HSMT Hồ sơ mời thầu HSYC Hồ sơ yêu cầu HSDT Hồ sơ dự thầu HSĐX Hồ sơ đề xuất PHẦN 1. THÔNG TIN GIAO DỊCH Hôm nay, ngày ... tháng ... năm … tại … (Địa danh), chúng tôi gồm các bên dưới đây:\n1. Bên giao thầu: Tên giao dịch: … Đại diện (hoặc người được ủy quyền) là: Ông/Bà: … Chức vụ: Địa chỉ: … Tài khoản: … Mã số thuế: … Đăng ký kinh doanh (nếu có): … Điện thoại: … Fax: … E-mail: … Và bên kia là:\n2. Bên nhận thầu: Tên giao dịch: … Đại diện (hoặc người được ủy quyền) là: Ông/Bà: … Chức vụ: Địa chỉ: … Tài khoản: … Mã số thuế: … Đăng ký kinh doanh (nếu có): … Điện thoại: … Fax: … E-mail: … [Trường hợp Bên nhận thầu là liên danh thì ghi đầy đủ thông tin như trên của các thành viên trong liên danh và cử đại diện thành viên trong liên danh giao dịch theo phân công trong thỏa thuận liên danh.] [Trường hợp các bên ủy quyền theo quy định pháp luật cho cá nhân, pháp nhân khác giao kết hợp đồng thì phải ghi rõ thông tin về giấy ủy quyền.] [Trường hợp hợp đồng xây dựng được giao dịch bằng phương thức điện tử thì phải tuân thủ pháp luật về giao dịch điện tử.] Hai bên cùng thống nhất ký hợp đồng tư vấn thiết kế xây dựng gói thầu ("
      },
      {
        "id": "DL26-329464-36",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ",
        "clauseCount": 1,
        "content": "Trong hợp đồng này, các từ ngữ dưới đây được hiểu như sau 1.1. Bên giao thầu là ... (tên giao dịch của Bên giao thầu). 1.2. Bên nhận thầu là ... (tên giao dịch của Bên nhận thầu). 1.3. Bên là Bên giao thầu hoặc Bên nhận thầu tùy theo hoàn cảnh cụ thể. 1.4. Công trình là ... (tên công trình mà Bên nhận thầu thực hiện gói thầu xây dựng theo hợp đồng này). 1.5. Dự án là dự án ... (tên dự án hoặc dự án có công trình mà Bên nhận thầu thực hiện gói thầu xây dựng theo hợp đồng này). 1.6. Đại diện Bên giao thầu là người đại diện hợp pháp theo quy định pháp luật hoặc cá nhân, pháp nhân khác được ủy quyền giao kết hợp đồng theo quy định pháp luật. 1.7. Đại diện Bên nhận thầu là người đại diện hợp pháp theo quy định pháp luật hoặc cá nhân, pháp nhân khác được ủy quyền giao kết hợp đồng theo quy định pháp luật. 1.8. Địa điểm dự án là địa điểm được nêu tại HSMT hoặc HSYC (nếu có) của Bên giao thầu; 1.9. Đơn dự thầu (nếu có) là đề xuất của Bên nhận thầu có ghi giá dự thầu để thực hiện công việc theo đúng các yêu cầu của HSMT hoặc HSYC. 1.10. Gói thầu là ... (tên gói thầu mà Bên nhận thầu thực hiện công việc xây dựng theo hợp đồng này). 1.11. Giá hợp đồng là giá trị ghi trong hợp đồng giữa Bên gi"
      }
    ]
  },
  {
    "id": "DOC-DL26-52D72A17",
    "ssotFileName": "1040-2026_QD-BXD_QLHD_MauHDTuVanThietKe-PL2.pdf",
    "docNumber": "1040/QĐ-BXD (PL2)",
    "docType": "QD",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLHD",
    "title": "Phụ lục II (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng tư vấn thiết kế xây dựng công trình",
    "shortSummary": "Phụ lục II (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng tư vấn thiết kế xây dựng công trình",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 68,
    "clauseTotalCount": 52,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLHD"
    ],
    "linkedGates": [
      "G7",
      "G11"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 30 trang",
      "LV: QLHD",
      "Phụ lục đính kèm",
      "G7",
      "G11"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_1040-2026_QD_BXD_MauHopDongThietKe-PL2.pdf · 30 trang · 0.59 MB · SHA256: 52D72A175405)",
    "nodes": [
      {
        "id": "DL26-52D72A-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 21,
        "content": "PHỤ LỤC II\nMẪU HỢP ĐỒNG TƯ VẤN THIẾT KẾ XÂY DỰNG\n(Công bố kèm theo Quyết định số 1040/QĐ-BXD ngày 26/6/2026 của\nBộ trưởng Bộ Xây dựng về việc công bố mẫu hợp đồng xây dựng)\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n---------------\n(Địa danh), ngày …. tháng …. năm …..\nHỢP ĐỒNG TƯ VẤN THIẾT KẾ XÂY DỰNG\nSố: ……/(Năm) /... (Ký hiệu hợp đồng)\nGói thầu (số, tên gói thầu)\nthuộc Dự án/Công trình (tên, mã định danh Dự án/Công trình)\ngiữa\n(Tên giao dịch của Bên giao thầu)\nvà\n(Tên giao dịch của Bên nhận thầu)\nMỤC LỤC\nDANH MỤC CÁC CHỮ VIẾT TẮT ................................................................... 5\nPHẦN 1. THÔNG TIN GIAO DỊCH ................................................................... 6\nPHẦN 2. CÁC CĂN CỨ GIAO KẾT HỢP ĐỒNG ............................................. 7\nPHẦN 3. ĐIỀU KIỆN CHUNG CỦA HỢP ĐỒNG ............................................ 8"
      },
      {
        "id": "DL26-52D72A-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ ..................................................................................... 8",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên ........................................................... 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Sử dụng các tài liệu, thông tin liên quan đến hợp đồng và bản quyền 9",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Trao đổi thông tin .................................................................................. 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-6",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Luật áp dụng và ngôn ngữ sử dụng trong hợp đồng ............................. 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-7",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung, khối lượng công việc và sản phẩm của hợp đồng ................ 11",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-8",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, số lượng sản phẩm .......................................... 12",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-9",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng .............................................. 12",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-10",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng, thanh toán ....................................................... 12",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-11",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Nghiệm thu sản phẩm ........................................................................... 13",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-12",
        "level": "Điều",
        "code": "Điều 11",
        "title": "Quyền, nghĩa vụ và trách nhiệm của Bên nhận thầu ............................ 14",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-13",
        "level": "Điều",
        "code": "Điều 12",
        "title": "Quyền, nghĩa vụ và trách nhiệm của Bên giao thầu ............................. 16",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-14",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Giải quyết tranh chấp, khiếu nại trong quá trình thực hiện hợp đồng .. 17",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-15",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản ............... 18",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-16",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ (nếu có) ........................................................................... 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-17",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Nhân lực của Bên nhận thầu ................................................................. 20",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-18",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Sửa đổi hợp đồng .................................................................................. 21",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-19",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng và chấm dứt hợp đồng ......................................................... 22",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-20",
        "level": "Điều",
        "code": "Điều 19",
        "title": "Quyết toán và thanh lý hợp đồng .......................................................... 24",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-21",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Điều khoản chung ................................................................................. 24",
        "clauseCount": 1,
        "content": "PHẦN 4. ĐIỀU KIỆN CỤ THỂ CỦA HỢP ĐỒNG .......................................... 25"
      },
      {
        "id": "DL26-52D72A-22",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên ........................................................... 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-23",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Trao đổi thông tin ................................................................................... 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-24",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Nội dung, khối lượng công việc và sản phẩm của hợp đồng ................. 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-25",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Yêu cầu về chất lượng, số lượng sản phẩm ............................................ 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-26",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng ............................................... 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-27",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Giá hợp đồng, tạm ứng, thanh toán ........................................................ 25",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-28",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Nghiệm thu sản phẩm ........................................................................... 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-29",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Giải quyết tranh chấp, khiếu nại trong quá trình thực hiện hợp đồng . 26",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-30",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Rủi ro, sự kiện bất khả kháng và hoàn cảnh thay đổi cơ bản ............... 27",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-31",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ (nếu có) .......................................................................... 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-32",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Nhân lực của Bên nhận thầu ................................................................. 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-33",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Sửa đổi hợp đồng .................................................................................. 28",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-34",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Tạm dừng hợp đồng ............................................................................. 29",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-52D72A-35",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Điều khoản chung ................................................................................. 29",
        "clauseCount": 2,
        "content": "DANH MỤC CÁC CHỮ VIẾT TẮT ĐKC Điều kiện chung ĐKCT Điều kiện cụ thể HSMT Hồ sơ mời thầu HSYC Hồ sơ yêu cầu HSDT Hồ sơ dự thầu HSĐX Hồ sơ đề xuất PHẦN 1. THÔNG TIN GIAO DỊCH Hôm nay, ngày ... tháng ... năm … tại … (Địa danh), chúng tôi gồm các bên dưới đây:\n1. Bên giao thầu: Tên giao dịch: … Đại diện (hoặc người được ủy quyền) là: Ông/Bà: … Chức vụ: Địa chỉ: … Tài khoản: … Mã số thuế: … Đăng ký kinh doanh (nếu có): … Điện thoại: … Fax: … E-mail: … Và bên kia là:\n2. Bên nhận thầu: Tên giao dịch: … Đại diện (hoặc người được ủy quyền) là: Ông/Bà: … Chức vụ: Địa chỉ: … Tài khoản: … Mã số thuế: … Đăng ký kinh doanh (nếu có): … Điện thoại: … Fax: … E-mail: … [Trường hợp Bên nhận thầu là liên danh thì ghi đầy đủ thông tin như trên của các thành viên trong liên danh và cử đại diện thành viên trong liên danh giao dịch theo phân công trong thỏa thuận liên danh.] [Trường hợp các bên ủy quyền theo quy định pháp luật cho cá nhân, pháp nhân khác giao kết hợp đồng thì phải ghi rõ thông tin về giấy ủy quyền.] [Trường hợp hợp đồng xây dựng được giao dịch bằng phương thức điện tử thì phải tuân thủ pháp luật về giao dịch điện tử.] Hai bên cùng thống nhất ký hợp đồng tư vấn thiết kế xây dựng gói thầu ("
      },
      {
        "id": "DL26-52D72A-36",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ",
        "clauseCount": 1,
        "content": "Trong hợp đồng này, các từ ngữ dưới đây được hiểu như sau 1.1. Bên giao thầu là ... (tên giao dịch của Bên giao thầu). 1.2. Bên nhận thầu là ... (tên giao dịch của Bên nhận thầu). 1.3. Bên là Bên giao thầu hoặc Bên nhận thầu tùy theo hoàn cảnh cụ thể. 1.4. Công trình là ... (tên công trình mà Bên nhận thầu thực hiện gói thầu xây dựng theo hợp đồng này). 1.5. Dự án là dự án ... (tên dự án hoặc dự án có công trình mà Bên nhận thầu thực hiện gói thầu xây dựng theo hợp đồng này). 1.6. Đại diện Bên giao thầu là người đại diện hợp pháp theo quy định pháp luật hoặc cá nhân, pháp nhân khác được ủy quyền giao kết hợp đồng theo quy định pháp luật. 1.7. Đại diện Bên nhận thầu là người đại diện hợp pháp theo quy định pháp luật hoặc cá nhân, pháp nhân khác được ủy quyền giao kết hợp đồng theo quy định pháp luật. 1.8. Địa điểm dự án là địa điểm được nêu tại HSMT hoặc HSYC (nếu có) của Bên giao thầu; 1.9. Đơn dự thầu (nếu có) là đề xuất của Bên nhận thầu có ghi giá dự thầu để thực hiện công việc theo đúng các yêu cầu của HSMT hoặc HSYC. 1.10. Gói thầu là ... (tên gói thầu mà Bên nhận thầu thực hiện công việc xây dựng theo hợp đồng này). 1.11. Giá hợp đồng là giá trị ghi trong hợp đồng giữa Bên gi"
      }
    ]
  },
  {
    "id": "DOC-DL26-3EAC917A",
    "ssotFileName": "1040-2026_QD-BXD_QLHD_MauHopDongEPC-PL7.pdf",
    "docNumber": "1040/QĐ-BXD (PL7)",
    "docType": "QD",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLHD",
    "title": "Phụ lục VII (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng EPC (Thiết kế – Cung cấp thiết bị – Thi công xây dựng)",
    "shortSummary": "Phụ lục VII (QĐ 1040/QĐ-BXD) — Mẫu Hợp đồng EPC (Thiết kế – Cung cấp thiết bị – Thi công xây dựng)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 94,
    "clauseTotalCount": 52,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLHD"
    ],
    "linkedGates": [
      "G11",
      "G12",
      "G13"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 66 trang",
      "LV: QLHD",
      "Phụ lục đính kèm",
      "G11",
      "G12",
      "G13"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_1040-2026_QD_BXD_MauEPC-PL7.pdf · 66 trang · 0.63 MB · SHA256: 3EAC917AC3C6)",
    "nodes": [
      {
        "id": "DL26-3EAC91-1",
        "level": "Mở đầu",
        "code": "Căn cứ",
        "title": "Căn cứ ban hành · Lời mở đầu",
        "clauseCount": 22,
        "content": "PHỤ LỤC VII\nMẪU HỢP ĐỒNG EPC\n(Công bố kèm theo Quyết định số 1040/QĐ-BXD ngày 26/6/2026 của\nBộ trưởng Bộ Xây dựng về việc công bố mẫu hợp đồng xây dựng)\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n---------------\n(Địa danh), ngày ……..tháng……. năm …….\nHỢP ĐỒNG THIẾT KẾ - CUNG CẤP VẬT TƯ, THIẾT BỊ - THI CÔNG\nXÂY DỰNG CÔNG TRÌNH\nSố: ……./.....(Năm) /...(ký hiệu hợp đồng)\nGói thầu (số, tên gói thầu)\nthuộc Dự án/Công trình (tên, mã định danh Dự án/Công trình)\ngiữa\n(Tên giao dịch của Bên giao thầu)\nvà\n(Tên giao dịch của Bên nhận thầu)\nMỤC LỤC\nDANH MỤC CÁC TỪ VIẾT TẮT ......................................................................... 5\nPHẦN 1. THÔNG TIN GIAO DỊCH CỦA CHỦ ĐẦU TƯ VÀ NHÀ THẦU  ..... 5\nPHẦN 2. CÁC CĂN CỨ KÝ KẾT HỢP ĐỒNG  ................................................... 6\nPHẦN 3 - ĐIỀU KIỆN CHUNG CỦA HỢP ĐỒNG  ............................................. 7"
      },
      {
        "id": "DL26-3EAC91-2",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ ......................................................................................... 6",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-3",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên  .............................................................. 8",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-4",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Các quy định chung  .................................................................................... 8",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-5",
        "level": "Điều",
        "code": "Điều 4",
        "title": "Phạm vi Công việc  ..................................................................................... 10",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-6",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Các yêu cầu đối với công tác thiết kế xây dựng công trình, cung cấp vật tư,",
        "clauseCount": 1,
        "content": "vật liệu thiết bị để lắp đặt vào công trình và thi công xây dựng công trình  ........... 11"
      },
      {
        "id": "DL26-3EAC91-7",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Thử nghiệm, chạy thử khi hoàn thành  ....................................................... 15",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-8",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Nghiệm thu của Chủ đầu tư  ....................................................................... 15",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-9",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng  ................................................... 19",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-10",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Bảo lãnh thực hiện hợp đồng và tiền tạm ứng  ........................................... 22",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-11",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Giá hợp đồng, tạm ứng và thanh toán  ...................................................... 23",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-12",
        "level": "Điều",
        "code": "Điều 11",
        "title": "Quyền, trách nhiệm và nghĩa vụ chung của Chủ đầu tư  .......................... 24",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-13",
        "level": "Điều",
        "code": "Điều 12",
        "title": "Nhiệm vụ, quyền hạn của Nhà tư vấn  ...................................................... 27",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-14",
        "level": "Điều",
        "code": "Điều 13",
        "title": "Quyền, trách nhiệm và nghĩa vụ chung của Nhà thầu  ............................. 29",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-15",
        "level": "Điều",
        "code": "Điều 14",
        "title": "Sửa đổi Hợp đồng  .................................................................................... 38",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-16",
        "level": "Điều",
        "code": "Điều 15",
        "title": "Nhà thầu phụ  ............................................................................................ 39",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-17",
        "level": "Điều",
        "code": "Điều 16",
        "title": "Tạm dừng, chấm dứt hợp đồng bởi Chủ đầu tư  ....................................... 41",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-18",
        "level": "Điều",
        "code": "Điều 17",
        "title": "Tạm ngừng chấm dứt hợp đồng bởi Nhà thầu  ......................................... 43",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-19",
        "level": "Điều",
        "code": "Điều 18",
        "title": "Bảo hiểm và bảo hành công trình  ............................................................ 45",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-20",
        "level": "Điều",
        "code": "Điều 19",
        "title": "Trách nhiệm đối với các sai sót  ......................................................................... 45",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-21",
        "level": "Điều",
        "code": "Điều 20",
        "title": "Thưởng, phạt do vi phạm hợp đồng và trách nhiệm bồi thường thiệt hại",
        "clauseCount": 1,
        "content": ".................................................................................................................................. 47"
      },
      {
        "id": "DL26-3EAC91-22",
        "level": "Điều",
        "code": "Điều 21",
        "title": "Rủi ro, bất khả kháng và hoàn cảnh thay đổi cơ bản  ............................... 49",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-23",
        "level": "Điều",
        "code": "Điều 22",
        "title": "Khiếu nại và giải quyết tranh chấp  .......................................................... 52",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-24",
        "level": "Điều",
        "code": "Điều 23",
        "title": "Quyết toán và thanh lý hợp đồng  ............................................................. 57",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-25",
        "level": "Điều",
        "code": "Điều 24",
        "title": "Hiệu lực của hợp đồng  ............................................................................. 58",
        "clauseCount": 1,
        "content": "PHẦN 4 - ĐIỀU KIỆN CỤ THỂ CỦA HỢP ĐỒNG ............................................. 60"
      },
      {
        "id": "DL26-3EAC91-26",
        "level": "Điều",
        "code": "Điều 1",
        "title": "Giải thích từ ngữ",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-27",
        "level": "Điều",
        "code": "Điều 2",
        "title": "Hồ sơ hợp đồng và thứ tự ưu tiên",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-28",
        "level": "Điều",
        "code": "Điều 3",
        "title": "Các quy định chung",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-29",
        "level": "Điều",
        "code": "Điều 5",
        "title": "Các yêu cầu đối với công tác thiết kế xây dựng công trình, cung cấp vật tư,",
        "clauseCount": 1,
        "content": "vật liệu thiết bị để lắp đặt vào công trình và thi công xây dựng công trình"
      },
      {
        "id": "DL26-3EAC91-30",
        "level": "Điều",
        "code": "Điều 6",
        "title": "Thử nghiệm, chạy thử khi hoàn thành",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-31",
        "level": "Điều",
        "code": "Điều 7",
        "title": "Nghiệm thu của Chủ đầu tư",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-32",
        "level": "Điều",
        "code": "Điều 8",
        "title": "Thời gian và tiến độ thực hiện hợp đồng",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-33",
        "level": "Điều",
        "code": "Điều 9",
        "title": "Bảo lãnh thực hiện hợp đồng và tiền tạm ứng",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-34",
        "level": "Điều",
        "code": "Điều 10",
        "title": "Giá hợp đồng, tạm ứng và thanh toán",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-35",
        "level": "Điều",
        "code": "Điều 11",
        "title": "Quyền, trách nhiệm và nghĩa vụ chung của Chủ đầu tư",
        "clauseCount": 1,
        "content": ""
      },
      {
        "id": "DL26-3EAC91-36",
        "level": "Điều",
        "code": "Điều 12",
        "title": "Nhiệm vụ, quyền hạn của Nhà tư vấn",
        "clauseCount": 1,
        "content": ""
      }
    ]
  },
  {
    "id": "DOC-DL26-936E5C59",
    "ssotFileName": "36-2026_TT-BXD_QLCP_XacDinhChiPhiXayDung-PL3.pdf",
    "docNumber": "36/2026/TT-BXD (PL3)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục III (TT 36/2026/TT-BXD) — Phương pháp xác định Chi phí xây dựng (trực tiếp, gián tiếp, thu nhập chịu thuế)",
    "shortSummary": "Phụ lục III (TT 36/2026/TT-BXD) — Phương pháp xác định Chi phí xây dựng (trực tiếp, gián tiếp, thu nhập chịu t",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G10",
      "G13"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 12 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9",
      "G10",
      "G13"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_36-2026_TT_BXD_XDChiphiXaydung-PL3.pdf · 12 trang · 0.33 MB · SHA256: 936E5C591A85)",
    "nodes": [
      {
        "id": "DL26-936E5C-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục III (TT 36/2026/TT-BXD) — Phương pháp xác định Chi phí xây dựng (trực tiếp, gián tiếp, thu nhập chịu thuế)",
        "clauseCount": 10,
        "content": "Phụ lục III\nPHƯƠNG PHÁP XÁC ĐỊNH CHI PHÍ XÂY DỰNG\n(Kèm theo Thông tư số 36/2026/TT-BXD ngày 26 tháng 6 năm 2026\ncủa Bộ trưởng Bộ Xây dựng)\n1. Chi phí xây dựng trong dự toán xây dựng công trình được xác định cho\ncông trình, hạng mục công trình của dự án; công trình, hạng mục công trình xây\ndựng tạm, phụ trợ phục vụ thi công; phá dỡ các công trình xây dựng không thuộc\nphạm vi của công tác phá dỡ giải phóng mặt bằng (nếu có).\nCác khoản mục chi phí của dự toán chi phí xây dựng gồm chi phí trực tiếp,\nchi phí gián tiếp, thu nhập chịu thuế tính trước, thuế giá trị gia tăng, chi phí nhà\ntạm để ở và điều hành thi công.\nBảng 3.1: TỔNG HỢP CHI PHÍ XÂY DỰNG\nDự án:....................................................................................................................\nCông trình:...........................................................................................................\nĐơn vị tính:...\nSTT\nNỘI DUNG CHI PHÍ\nGIÁ\nTRỊ\nTRƯỚC\nTHUẾ\nTHUẾ\nGTGT\nGIÁ"
      },
      {
        "id": "DL26-936E5C-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (12 trang · 0.33 MB)",
        "clauseCount": 2,
        "content": "công đặc thù;\nb) Chi phí gián tiếp xác định bằng 50% chi phí gián tiếp theo hướng dẫn tại\nkhoản 3 Phụ lục này.\n- C: chi phí chung;\n- TT: chi phí một số công việc không xác định được khối lượng từ thiết kế;\nc) TL: thu nhập chịu thuế tính trước xác định bằng 50% thu nhập chịu thuế\ntính trước theo hướng dẫn tại khoản 4 Phụ lục này;\nd) GXDTT: chi phí xây dựng công trình, hạng mục công trình trước thuế;\nđ) TGTGT: mức thuế suất thuế GTGT theo quy định;\ne) GXD: chi phí xây dựng sau thuế;\ng) LT: chi phí nhà tạm để ở và điều hành thi công xác định theo hướng dẫn\ntại khoản 5 Phụ lục này."
      }
    ]
  },
  {
    "id": "DOC-DL26-7AC23972",
    "ssotFileName": "36-2026_TT-BXD_QLCP_XacDinhDuToanKhaoSatThiNghiem-PL5.pdf",
    "docNumber": "36/2026/TT-BXD (PL5)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục V (TT 36/2026/TT-BXD) — Phương pháp xác định Dự toán chi phí khảo sát & thí nghiệm chuyên ngành XD",
    "shortSummary": "Phụ lục V (TT 36/2026/TT-BXD) — Phương pháp xác định Dự toán chi phí khảo sát & thí nghiệm chuyên ngành XD",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G2",
      "G9",
      "G12"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 5 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G2",
      "G9",
      "G12"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_36-2026_TT_BXD_XDDutoanKhaosat-PL5.pdf · 5 trang · 0.52 MB · SHA256: 7AC2397283BE)",
    "nodes": [
      {
        "id": "DL26-7AC239-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục V (TT 36/2026/TT-BXD) — Phương pháp xác định Dự toán chi phí khảo sát & thí nghiệm chuyên ngành XD",
        "clauseCount": 10,
        "content": "Phụ lục V\nPHƯƠNG PHÁP XÁC ĐỊNH DỰ TOÁN CHI PHÍ KHẢO SÁT XÂY\nDỰNG VÀ CHI PHÍ THÍ NGHIỆM CHUYÊN NGÀNH XÂY DỰNG\n(Kèm theo Thông tư số 36/2026/TT-BXD ngày 26 tháng 6 năm 2026\ncủa Bộ trưởng Bộ Xây dựng)\nI. XÁC ĐỊNH DỰ TOÁN CHI PHÍ KHẢO SÁT XÂY DỰNG\nDự toán chi phí khảo sát xây dựng xác định theo công thức sau:\nGks = [(T + GT + TL) + Cpvks] x (1 + TGTGT) + LT + Cdp     (5.1)\nTrong đó:\n- Gks: dự toán chi phí khảo sát xây dựng;\n- T: chi phí trực tiếp;\n- GT: chi phí gián tiếp;\n- TL: thu nhập chịu thuế tính trước;\n- Cpvks: chi phí phục vụ công tác khảo sát xây dựng;\n- TGTGT: thuế suất thuế GTGT quy định cho công tác khảo sát xây dựng;\n- LT: chi phí nhà tạm để ở và điều hành thi công;\n- Cdp: chi phí dự phòng.\n1.1. Chi phí trực tiếp (T)\nChi phí trực tiếp được xác định theo khối lượng và đơn giá xây dựng chi\ntiết không đầy đủ theo công thức sau:\nm\nm\nm\nvl"
      },
      {
        "id": "DL26-7AC239-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (5 trang · 0.52 MB)",
        "clauseCount": 2,
        "content": "(Ký, họ tên)\nII. MỘT SỐ KHOẢN CHI PHÍ TƯ VẤN CÓ LIÊN QUAN ĐẾN\nCÔNG TÁC KHẢO SÁT XÂY DỰNG\n2.1. Chi phí lập nhiệm vụ khảo sát xây dựng xác định bằng 3% của dự toán\nchi phí khảo sát xây dựng tương ứng.\n2.2. Chi phí giám sát công tác khảo sát xây dựng xác định trên cơ sở định\nmức tỷ lệ phần trăm (%) do Bộ trưởng Bộ Xây dựng ban hành.\nIII. DỰ TOÁN CHI PHÍ THÍ NGHIỆM CHUYÊN NGÀNH\nDự toán chi phí thí nghiệm chuyên ngành gồm chi phí trực tiếp, chi phí gián\ntiếp, thu nhập chịu thuế tính trước, chi phí lập báo cáo kết quả thí nghiệm và các\nchi phí khác (nếu có); được lập tương tự như dự toán chi phí khảo sát xây dựng\ntại phần I Phụ lục này."
      }
    ]
  },
  {
    "id": "DOC-DL26-E9917D7D",
    "ssotFileName": "36-2026_TT-BXD_QLCP_XacDinhDuToanXayDung-PL2.pdf",
    "docNumber": "36/2026/TT-BXD (PL2)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục II (TT 36/2026/TT-BXD) — Phương pháp xác định Dự toán xây dựng công trình & Dự toán gói thầu",
    "shortSummary": "Phụ lục II (TT 36/2026/TT-BXD) — Phương pháp xác định Dự toán xây dựng công trình & Dự toán gói thầu",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G10"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 15 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9",
      "G10"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_36-2026_TT_BXD_XDDutoanXD-PL2.pdf · 15 trang · 0.33 MB · SHA256: E9917D7D24DE)",
    "nodes": [
      {
        "id": "DL26-E9917D-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục II (TT 36/2026/TT-BXD) — Phương pháp xác định Dự toán xây dựng công trình & Dự toán gói thầu",
        "clauseCount": 10,
        "content": "Phụ lục II\nPHƯƠNG PHÁP XÁC ĐỊNH DỰ TOÁN XÂY DỰNG\n(Kèm theo Thông tư số 36/2026/TT-BXD ngày 26 tháng 6 năm 2026\ncủa Bộ trưởng Bộ Xây dựng)\nMỤC 1\nPHƯƠNG PHÁP XÁC ĐỊNH DỰ TOÁN XÂY DỰNG CÔNG TRÌNH\nDự toán xây dựng công trình được xác định theo công thức (2.1) sau đây\nvà được tổng hợp theo Bảng 2.1:\nGXDCT = GXD + GTB + GQLDA + GTV + GK + GDP                (2.1)\nTrong đó:\n- GXDCT: dự toán xây dựng công trình;\n- GXD: chi phí xây dựng;\n- GTB: chi phí thiết bị;\n- GQLDA: chi phí quản lý dự án;\n- GTV: chi phí tư vấn xây dựng;\n- GK: chi phí khác;\n- GDP: chi phí dự phòng.\nBảng 2.1: TỔNG HỢP DỰ TOÁN XÂY DỰNG CÔNG TRÌNH\nDự án:...................................................................................................................\nCông trình:............................................................................................................\nĐơn vị tính...\nSTT\nNỘI DUNG CHI PHÍ\nGIÁ"
      },
      {
        "id": "DL26-E9917D-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (15 trang · 0.33 MB)",
        "clauseCount": 2,
        "content": "T\n5\nChi phí dự phòng\n(Ctt + Ck + TL + T) x Tỷ lệ\nCdp\nTỔNG CỘNG\nCtt + Ck + TL + T + Cdp\nCCVXD\nNGƯỜI LẬP\n(Ký, họ tên)\nNGƯỜI CHỦ TRÌ\n(Ký, họ tên)"
      }
    ]
  },
  {
    "id": "DOC-DL26-E84F2ACB",
    "ssotFileName": "36-2026_TT-BXD_QLCP_XacDinhGiaCongTacXayDung-PL4.pdf",
    "docNumber": "36/2026/TT-BXD (PL4)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục IV (TT 36/2026/TT-BXD) — Phương pháp xác định Giá công tác xây dựng và Giá nhóm công tác xây dựng",
    "shortSummary": "Phụ lục IV (TT 36/2026/TT-BXD) — Phương pháp xác định Giá công tác xây dựng và Giá nhóm công tác xây dựng",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G10"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 7 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9",
      "G10"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_36-2026_TT_BXD_XDGiacongtacXD-PL4.pdf · 7 trang · 0.28 MB · SHA256: E84F2ACB6EC2)",
    "nodes": [
      {
        "id": "DL26-E84F2A-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục IV (TT 36/2026/TT-BXD) — Phương pháp xác định Giá công tác xây dựng và Giá nhóm công tác xây dựng",
        "clauseCount": 10,
        "content": "Phụ lục IV\nPHƯƠNG PHÁP XÁC ĐỊNH GIÁ CÔNG TÁC XÂY DỰNG\nVÀ GIÁ NHÓM CÔNG TÁC XÂY DỰNG\n(Kèm theo Thông tư số 36/2026/TT-BXD ngày  26 tháng 6 năm 2026\ncủa Bộ trưởng Bộ Xây dựng)\n1. Quy định chung\n1.1. Giá công tác xây dựng được xác định cho công tác xây dựng trên cơ sở\nđịnh mức dự toán công tác xây dựng, giá các yếu tố chi phí trực tiếp cấu thành giá\ncông tác xây dựng (gồm giá vật liệu xây dựng, giá nhân công xây dựng, giá ca\nmáy và thiết bị thi công) và các yếu tố chi phí cần thiết khác hoặc được xác định\ntrên cơ sở báo giá của đơn vị thi công, nhà sản xuất, nhà cung cấp hoặc theo giá\ntương tự ở các công trình đã thực hiện hoặc đang thực hiện.\n1.2. Giá nhóm công tác xây dựng được xác định trên cơ sở tổng hợp giá của\ncác công tác xây dựng.\n1.3. Phụ lục này hướng dẫn phương pháp xác định giá công tác xây dựng\ntrên cơ sở định mức dự toán công tác xây dựng và giá các yếu tố chi phí trực tiếp\ncấu thành giá công tác xây dựng tại khoản 2 Phụ lục này; hướng dẫn phương pháp\nxác định giá nhóm công tác xây dựng tại khoản 3 Phụ lục này.\n1.4. Trường hợp giá bộ phận, đơn vị kết cấu công trình được xác định trên\ncơ sở giá nhóm công tác xây dựng theo quy định tại điểm c khoản 1 Điều 22 Nghị\nđịnh số 206/2026/NĐ-CP thì thực hiện theo hướng dẫn tại khoản 3 Phụ lục này.\n2. Phương pháp xác định giá công tác xây dựng\n2.1. Cơ sở xác định giá công tác xây dựng\n- Định mức dự toán tương ứng với công tác xâ"
      },
      {
        "id": "DL26-E84F2A-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (7 trang · 0.28 MB)",
        "clauseCount": 2,
        "content": "M\nGiá\nnhóm\ncông\ntác xây\ndựng 2\n…\n3.3. Trường hợp sử dụng giá nhóm công tác xây dựng để xác định giá bộ\nphận, đơn vị kết cấu công trình, cần thực hiện quy đổi giá các công tác xây dựng,\n7\ngiá nhóm công tác xây dựng liên quan đến bộ phận, đơn vị kết cấu công trình theo\nđơn vị tính giá bộ phận, đơn vị kết cấu công trình."
      }
    ]
  },
  {
    "id": "DOC-DL26-EAEDE3EF",
    "ssotFileName": "36-2026_TT-BXD_QLCP_XacDinhSoBoTongMucDauTu-PL1.pdf",
    "docNumber": "36/2026/TT-BXD (PL1)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục I (TT 36/2026/TT-BXD) — Phương pháp xác định Sơ bộ TMĐT & Tổng mức đầu tư xây dựng",
    "shortSummary": "Phụ lục I (TT 36/2026/TT-BXD) — Phương pháp xác định Sơ bộ TMĐT & Tổng mức đầu tư xây dựng",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G2",
      "G5"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 15 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G2",
      "G5"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_36-2026_TT_BXD_XDSoboTMDT-PL1.pdf · 15 trang · 0.35 MB · SHA256: EAEDE3EFA0F1)",
    "nodes": [
      {
        "id": "DL26-EAEDE3-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục I (TT 36/2026/TT-BXD) — Phương pháp xác định Sơ bộ TMĐT & Tổng mức đầu tư xây dựng",
        "clauseCount": 10,
        "content": "Phụ lục I\nPHƯƠNG PHÁP XÁC ĐỊNH SƠ BỘ TỔNG MỨC ĐẦU TƯ XÂY DỰNG,\nTỔNG MỨC ĐẦU TƯ XÂY DỰNG\n(Kèm theo Thông tư số 36/2026/TT-BXD ngày 26 tháng 6 năm 2026\ncủa Bộ trưởng Bộ Xây dựng)\nI. PHƯƠNG PHÁP XÁC ĐỊNH SƠ BỘ TỔNG MỨC ĐẦU TƯ\nXÂY DỰNG\nSơ bộ tổng mức đầu tư xây dựng được xác định trên cơ sở phương pháp\nquy định tại khoản 1, khoản 2 phần I Phụ lục này. Cơ quan được giao chuẩn bị dự\nán hoặc chủ đầu tư (trong trường hợp đã xác định được đơn vị làm chủ đầu tư của\ndự án) và đơn vị tư vấn lựa chọn phương pháp xác định sơ bộ tổng mức đầu tư\ntrên cơ sở mức độ chi tiết của hồ sơ thiết kế sơ bộ, nội dung báo cáo nghiên cứu\ntiền khả thi, thuyết minh thiết kế, tiêu chuẩn, phương án công nghệ dự kiến áp\ndụng cho dự án (nếu có). Việc lựa chọn phương pháp xác định sơ bộ tổng mức\nđầu tư được thuyết minh trong hồ sơ xác định sơ bộ tổng mức đầu tư.\nDự kiến tổng mức đầu tư dự án nhóm B, nhóm C được xác định như sơ bộ\ntổng mức đầu tư.\n1. Xác định theo suất vốn đầu tư xây dựng của toàn bộ dự án\nSơ bộ tổng mức đầu tư xây dựng xác định trên cơ sở suất vốn đầu tư xây\ndựng của toàn bộ dự án như sau:\nVSB = GSB\nBT,TĐC + P x SSVĐT x kĐC + C + GSB\nDP      (1.1)\nTrong đó:"
      },
      {
        "id": "DL26-EAEDE3-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (15 trang · 0.35 MB)",
        "clauseCount": 2,
        "content": "7.2\nChi phí dự phòng cho yếu tố trượt\ngiá\nGDP2\nTỔNG CỘNG\n(1+2+3+4+5+6+7)\nVTM\nNGƯỜI LẬP\n(Ký, họ tên)\nNGƯỜI CHỦ TRÌ\n(Ký, họ tên)\n15"
      }
    ]
  },
  {
    "id": "DOC-DL26-0178A3CD",
    "ssotFileName": "37-2026_TT-BXD_QLCP_KhaoSatCongBoGiaVLXD-PL2.pdf",
    "docNumber": "37/2026/TT-BXD (PL2)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục II (TT 37/2026/TT-BXD) — Hướng dẫn khảo sát, thu thập, công bố thông tin giá vật liệu xây dựng",
    "shortSummary": "Phụ lục II (TT 37/2026/TT-BXD) — Hướng dẫn khảo sát, thu thập, công bố thông tin giá vật liệu xây dựng",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G12"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 3 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9",
      "G12"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_37-2026_TT_BXD_HDKhaosatGiaVLXD-PL2.pdf · 3 trang · 0.36 MB · SHA256: 0178A3CD07B2)",
    "nodes": [
      {
        "id": "DL26-0178A3-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục II (TT 37/2026/TT-BXD) — Hướng dẫn khảo sát, thu thập, công bố thông tin giá vật liệu xây dựng",
        "clauseCount": 10,
        "content": "Phụ lục II\nHƯỚNG DẪN KHẢO SÁT, THU THẬP, CÔNG BỐ THÔNG TIN VỀ GIÁ\nVẬT LIỆU XÂY DỰNG\n(Kèm theo Thông tư số  37/2026/TT-BXD ngày  26/6/2026 của Bộ trưởng Bộ Xây dựng)\n1. Sở Xây dựng chủ trì, phối hợp với các cơ quan có liên quan theo phân\ncông của Ủy ban nhân dân cấp tỉnh thực hiện việc khảo sát, thu thập thông tin giá\nvật liệu xây dựng trên địa bàn đảm bảo khách quan, đáp ứng kịp thời việc phục\nvụ công bố theo quy định.\n2. Trình tự thu thập, khảo sát giá, công bố thông tin về giá vật liệu xây dựng\nđược xác định theo các bước sau:\na) Bước 1: Thực hiện thu thập thông tin liên quan đến giá vật liệu, tổ chức\nkhảo sát, nắm bắt thông tin thị trường, tình hình biến động giá và khả năng cung\nứng vật liệu xây dựng;\nb) Bước 2: Rà soát, xử lý thông tin thu thập, khảo sát; công bố thông tin về\ngiá các loại vật liệu xây dựng theo quy định.\n3. Tổ chức thực hiện:\na) Sở Xây dựng chủ trì, phối hợp với các cơ quan, đơn vị có liên quan tổ\nchức xây dựng danh sách các đầu mối cung cấp thông tin về giá vật liệu trên thị\ntrường xây dựng (gồm các chủ đầu tư, nhà thầu thi công của một số dự án đầu tư\ncông trên địa bàn, một số doanh nghiệp sản xuất, cung ứng vật liệu xây dựng trên\nđịa bàn tỉnh) để chủ động về nguồn thông tin dữ liệu phục vụ công tác thu thập,\ntổng hợp, công bố giá vật liệu xây dựng đảm bảo kịp thời nắm bắt thông tin, bám\nsát diễn biến thị trường, có phương án điều tiết khi cần thiết.\nĐồn"
      },
      {
        "id": "DL26-0178A3-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (3 trang · 0.36 MB)",
        "clauseCount": 2,
        "content": "ứng tại địa bàn xã X trong tháng được xác định như sau:\nGiá bình quân = 1.500 + 1.520 + 1.510\n3\n= 1.510đồng/kg\n* Ví dụ đối với nhóm vật liệu có nhiều chủng loại, đặc tính kỹ thuật, mẫu\nmã (mặt hàng gạch ốp lát):\nĐối tượng xác định giá: gạch ceramic lát nền, kích thước 600mm x 600mm,\nloại 1 của Nhà sản xuất B trên địa bàn tỉnh trong tháng công bố. Qua thông tin dữ\nliệu khảo sát, dòng sản phẩm này của Nhà sản xuất B có 05 mã sản phẩm tương\nđồng về đặc tính kỹ thuật, chỉ khác nhau về họa tiết, mẫu mã với các mức giá niêm\nyết lần lượt là: mã 01 là 170.000 đồng/m2; mã 02 là 172.000 đồng/m2; mã 03 là\n175.000 đồng/m2; mã 04 là 168.000 đồng/m2; mã 05 là 170.000 đồng/m2."
      }
    ]
  },
  {
    "id": "DOC-DL26-3482C529",
    "ssotFileName": "37-2026_TT-BXD_QLCP_XacDinhChiSoGiaXayDung-PL5.pdf",
    "docNumber": "37/2026/TT-BXD (PL5)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục V (TT 37/2026/TT-BXD) — Phương pháp xác định chỉ số giá xây dựng (phục vụ bù giá / trượt giá)",
    "shortSummary": "Phụ lục V (TT 37/2026/TT-BXD) — Phương pháp xác định chỉ số giá xây dựng (phục vụ bù giá / trượt giá)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G5",
      "G9",
      "G13"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 17 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G5",
      "G9",
      "G13"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_37-2026_TT_BXD_PPChiSoGia-PL5.pdf · 17 trang · 0.69 MB · SHA256: 3482C52971E3)",
    "nodes": [
      {
        "id": "DL26-3482C5-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục V (TT 37/2026/TT-BXD) — Phương pháp xác định chỉ số giá xây dựng (phục vụ bù giá / trượt giá)",
        "clauseCount": 10,
        "content": "Phụ lục V\nPHƯƠNG PHÁP XÁC ĐỊNH CHỈ SỐ GIÁ XÂY DỰNG\n(Kèm theo Thông tư số  37/2026/TT-BXD ngày 26/6/2026 của Bộ trưởng Bộ Xây dựng)\nI. HƯỚNG DẪN CHUNG XÁC ĐỊNH CHỈ SỐ GIÁ XÂY DỰNG\n1. Trình tự xác định chỉ số giá xây dựng\n- Xác định thời điểm tính toán gồm thời điểm gốc và thời điểm so sánh;\n- Lựa chọn các yếu tố đầu vào;\n- Thu thập, xử lý số liệu, dữ liệu;\n- Xác định chỉ số giá xây dựng.\n2. Thời điểm xác định chỉ số giá xây dựng\n2.1. Thời điểm xác định chỉ số giá xây dựng để công bố gồm:\na) Thời điểm gốc được quy định tại Thông tư hướng dẫn một số nội dung,\nphương pháp xác định và quản lý chi phí đầu tư xây dựng.\nb) Thời điểm so sánh là các tháng, quý và năm công bố chỉ số giá xây\ndựng so với thời điểm gốc.\n2.2. Trường hợp xác định chỉ số giá xây dựng cho công trình cụ thể thì\nchủ đầu tư phải căn cứ vào tiến độ và các điều kiện thực hiện công việc để lựa\nchọn thời điểm gốc, thời điểm so sánh cho phù hợp.\n3. Lựa chọn các yếu tố chi phí đầu vào\nCác yếu tố chi phí đầu vào đại diện là các chi phí về loại vật liệu, nhân\ncông, máy thi công xây dựng chủ yếu cho công trình hoặc loại công trình. Việc\nlựa chọn loại vật liệu, nhân công, máy thi công xây dựng chủ yếu để xác định\nchỉ số giá xây dựng được quy định tại Thông tư hướng dẫn một số nội dung,\nphương pháp xác định và quản lý chi phí đầu tư xây dựng."
      },
      {
        "id": "DL26-3482C5-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (17 trang · 0.69 MB)",
        "clauseCount": 2,
        "content": "6 Gạch ốp lát\n7 Gỗ xây dựng\n8 Thép xây dựng\n9 Nhựa đường\n10 Vật liệu tấm lợp bao che\n11 Cửa khung nhựa /nhôm\n12 Kính\n13 Sơn\n14 Vật tư điện\n15 Vật tư nước\n16 Trần, vách thạch cao\n… …"
      }
    ]
  },
  {
    "id": "DOC-DL26-06F567A7",
    "ssotFileName": "37-2026_TT-BXD_QLCP_XacDinhDinhMucDuToanMoi-PL1.pdf",
    "docNumber": "37/2026/TT-BXD (PL1)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục I (TT 37/2026/TT-BXD) — Phương pháp xác định định mức dự toán mới, điều chỉnh và rà soát định mức",
    "shortSummary": "Phụ lục I (TT 37/2026/TT-BXD) — Phương pháp xác định định mức dự toán mới, điều chỉnh và rà soát định mức",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 16 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_37-2026_TT_BXD_XDDMDT-PL1.pdf · 16 trang · 0.52 MB · SHA256: 06F567A76E93)",
    "nodes": [
      {
        "id": "DL26-06F567-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục I (TT 37/2026/TT-BXD) — Phương pháp xác định định mức dự toán mới, điều chỉnh và rà soát định mức",
        "clauseCount": 10,
        "content": "Phụ lục I\nPHƯƠNG PHÁP XÁC ĐỊNH ĐỊNH MỨC DỰ TOÁN MỚI, ĐIỀU CHỈNH\nĐỊNH MỨC DỰ TOÁN VÀ RÀ SOÁT, CẬP NHẬT HỆ THỐNG ĐỊNH MỨC\n(Kèm theo Thông tư số  37/2026/TT-BXD ngày  26/6/2026 của Bộ trưởng Bộ Xây dựng)\nI. XÁC ĐỊNH ĐỊNH MỨC DỰ TOÁN MỚI CỦA CÔNG TRÌNH\n1. Việc xác định định mức dự toán mới của công trình được thực hiện đối với\ncác công tác xây dựng chưa được quy định hoặc đã được quy định nhưng sử dụng\ncông nghệ thi công mới, biện pháp thi công, điều kiện thi công chưa quy định trong\nhệ thống định mức dự toán được cơ quan nhà nước có thẩm quyền ban hành.\n2. Phương pháp xác định định mức dự toán:\n2.1. Định mức dự toán xác định trong quá trình lập dự toán xây dựng công\ntrình được xác định theo phương pháp sau:\na) Tính toán theo hồ sơ thiết kế, quy chuẩn, tiêu chuẩn xây dựng, yêu cầu kỹ\nthuật và điều kiện thi công, biện pháp thi công được dự kiến. Trường hợp không\nđủ cơ sở xác định thì sử dụng số liệu của công trình có công nghệ, điều kiện và\nbiện pháp thi công tương tự.\nb) Đối với các công tác xây dựng sử dụng công nghệ, thiết bị, biện pháp thi công mới\nchưa phổ biến ở Việt Nam hoặc chưa đủ cơ sở xác định định mức theo quy định tại điểm a\nkhoản này thì được phép sử dụng định mức do tổ chức nước ngoài công bố (sau đây gọi tắt\nlà định mức nước ngoài) để phân tích, đánh giá, đề xuất áp dụng cho công trình.\n2.2. Định mức dự toán xác định trong quá trình thi công phục vụ cho việc rà\nsoát,"
      },
      {
        "id": "DL26-06F567-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (16 trang · 0.52 MB)",
        "clauseCount": 2,
        "content": "- Cột  (3), (4) thời gian bắt đầu và kết thúc cho từng công đoạn/bước công việc của công tác xây dựng. Trường hợp xuất hiện thời gian\nngừng thi công cần ghi chép đầy đủ thời gian bắt đầu, kết thúc khi ngừng thi công, lý do ngừng thi công được ghi vào cột ghi chú.\n- Đính kèm danh sách máy với đầy đủ các thông tin sau: Tên, chủng loại, xuất xứ máy; thông số kỹ thuật của máy (như: công\nsuất, trọng tải, trọng lượng, dung tích,...) do chủ đầu tư, nhà thầu cung cấp.\nĐại diện chủ đầu tư\n(ký, ghi rõ họ tên)\nĐơn vị tư vấn giám sát (nếu có)\n(ký, ghi rõ họ tên)\nNhà thầu thi công xây dựng\n(ký, ghi rõ họ tên)\nĐơn vị thực hiện khảo sát\n(ký, ghi rõ họ tên)"
      }
    ]
  },
  {
    "id": "DOC-DL26-E766559D",
    "ssotFileName": "37-2026_TT-BXD_QLCP_XacDinhGiaCaMayThietBi-PL4.pdf",
    "docNumber": "37/2026/TT-BXD (PL4)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục IV (TT 37/2026/TT-BXD) — Phương pháp xác định giá ca máy và thiết bị thi công xây dựng",
    "shortSummary": "Phụ lục IV (TT 37/2026/TT-BXD) — Phương pháp xác định giá ca máy và thiết bị thi công xây dựng",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 104 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_37-2026_TT_BXD_PPXayDinhCaMay-PL4.pdf · 104 trang · 1.88 MB · SHA256: E766559D5EDE)",
    "nodes": [
      {
        "id": "DL26-E76655-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục IV (TT 37/2026/TT-BXD) — Phương pháp xác định giá ca máy và thiết bị thi công xây dựng",
        "clauseCount": 10,
        "content": "Phụ lục IV\nPHƯƠNG PHÁP XÁC ĐỊNH GIÁ CA MÁY VÀ THIẾT BỊ\nTHI CÔNG XÂY DỰNG\n(Kèm theo Thông tư số  37/2026/TT-BXD ngày 26/6/2026 của Bộ trưởng Bộ Xây dựng)\nI. XÁC ĐỊNH GIÁ CA MÁY VÀ THIẾT BỊ THI CÔNG ĐỂ CÁC\nTỈNH, THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG CÔNG BỐ\nGiá ca máy và thiết bị thi công xây dựng (sau đây gọi là giá ca máy) là mức chi\nphí bình quân cho một ca làm việc theo quy định của máy và thiết bị thi công xây dựng.\nGiá ca máy gồm toàn bộ hoặc một số khoản mục chi phí như chi phí khấu hao, chi\nphí sửa chữa, chi phí nhiên liệu, năng lượng, chi phí nhân công vận hành điều\nkhiển và chi phí khác.\nGiá ca máy và thiết bị thi công để các tỉnh, thành phố trực thuộc Trung ương\ncông bố được xác định như sau:\n1. Trình tự xác định giá ca máy\n- Bước 1: Lập danh mục máy và thiết bị thi công xây dựng cần xác định giá\nca máy;\n- Bước 2: Xác định định mức các hao phí, các dữ liệu cơ bản và nguyên giá\nlàm cơ sở xác định giá ca máy;\n- Bước 3: Tính toán, xác định giá ca máy.\n2. Lập danh mục xác định giá ca máy và thiết bị thi công xây dựng\n- Các tỉnh, thành phố trực thuộc Trung ương căn cứ nhu cầu sử dụng máy\ntrên địa bàn để lập danh mục máy và thiết bị thi công làm cơ sở xác định giá ca\nmáy công bố;\n- Danh mục máy và thiết bị thi công phải phù hợp với hệ thống định mức do"
      },
      {
        "id": "DL26-E76655-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (104 trang · 1.88 MB)",
        "clauseCount": 2,
        "content": "5\n6\n7\nM203.0027\nThiết bị tạo dòng điện\n220\n10\n3,50\n5\n499.762\nGhi chú: Một số loại máy và thiết bị thi công không có thông tin nguyên giá tham khảo, việc xác định nguyên giá của máy và thiết bị\nthi công theo hướng dẫn nêu tại điểm c, khoản 1 Mục III Phụ lục này."
      }
    ]
  },
  {
    "id": "DOC-DL26-DB1A18FC",
    "ssotFileName": "37-2026_TT-BXD_QLCP_XacDinhGiaNhanCongXayDung-PL3.pdf",
    "docNumber": "37/2026/TT-BXD (PL3)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục III (TT 37/2026/TT-BXD) — Phương pháp xác định đơn giá nhân công xây dựng",
    "shortSummary": "Phụ lục III (TT 37/2026/TT-BXD) — Phương pháp xác định đơn giá nhân công xây dựng",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 17 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_37-2026_TT_BXD_XDGiaNhancong-PL3.pdf · 17 trang · 0.61 MB · SHA256: DB1A18FCCEF2)",
    "nodes": [
      {
        "id": "DL26-DB1A18-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục III (TT 37/2026/TT-BXD) — Phương pháp xác định đơn giá nhân công xây dựng",
        "clauseCount": 10,
        "content": "Phụ lục III\nPHƯƠNG PHÁP XÁC ĐỊNH GIÁ NHÂN CÔNG XÂY DỰNG\n(Kèm theo Thông tư số  37/2026/TT-BXD ngày 26/6/2026 của Bộ trưởng Bộ Xây dựng)\nI. XÁC ĐỊNH GIÁ NHÂN CÔNG XÂY DỰNG ĐỂ CÔNG BỐ\n1. Khảo sát, thu thập số liệu, xác định giá nhân công xây dựng\n1.1. Nguồn thông tin để thực hiện khảo sát, thu thập số liệu\na) Khảo sát trực tiếp, thu thập số liệu tại công trình trong khu vực công bố\nvà các doanh nghiệp trong lĩnh vực xây dựng trên địa bàn tỉnh/thành phố;\nb) Khảo sát, thu thập số liệu từ các chuyên gia có kinh nghiệm, chủ đầu tư,\nnhà thầu và cá nhân, tổ chức trong lĩnh vực xây dựng trên địa bàn tỉnh, thành phố;\nc) Thống kê số liệu từ Hệ thống thông tin, Cơ sở dữ liệu quốc gia về hoạt\nđộng xây dựng; hồ sơ quyết toán hoàn thành, số liệu kết quả trúng thầu của công\ntrình xây dựng tại khu vực công bố có điều chỉnh theo chỉ số giá nhân công xây\ndựng về thời điểm xác định;\nd) Kết hợp các kết quả khảo sát, thống kê nêu trên.\n1.2. Nguyên tắc khảo sát, thu thập số liệu để xác định, công bố giá nhân công\nxây dựng\na) Giá nhân công xây dựng được khảo sát, thu thập số liệu, xác định và công\nbố phù hợp với nhóm nhân công xây dựng quy định tại Bảng 3.1 Phụ lục này và\nquy định tại Thông tư hướng dẫn một số nội dung, phương pháp xác định và quản\nlý chi phí đầu tư xây dựng của Bộ trưởng Bộ Xây dựng.\nb) Việc xác định, công bố thông tin về giá nhân công xây dựng phải phù hợp\nvới mặt bằng giá nhân công"
      },
      {
        "id": "DL26-DB1A18-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (17 trang · 0.61 MB)",
        "clauseCount": 2,
        "content": "...\nĐổ bê tông sàn mái\n...\n2\n...\n...\n...\n...\nGiá nhân công xây\ndựng bình quân (đ/ngc)\nĐơn vị khảo sát\nĐại diện đơn vị Tổ chức khảo sát"
      }
    ]
  },
  {
    "id": "DOC-DL26-9BC69E13",
    "ssotFileName": "37-2026_TT-BXD_QLCP_XacDinhSuatVonDauTu-PL6.pdf",
    "docNumber": "37/2026/TT-BXD (PL6)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục VI (TT 37/2026/TT-BXD) — Phương pháp xác định suất vốn đầu tư xây dựng và suất chi phí",
    "shortSummary": "Phụ lục VI (TT 37/2026/TT-BXD) — Phương pháp xác định suất vốn đầu tư xây dựng và suất chi phí",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 1,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G2",
      "G5"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 13 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G2",
      "G5"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_37-2026_TT_BXD_PPSuatVonDauTu-PL6.pdf · 13 trang · 0.52 MB · SHA256: 9BC69E13B65B)",
    "nodes": [
      {
        "id": "DL26-9BC69E-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục VI (TT 37/2026/TT-BXD) — Phương pháp xác định suất vốn đầu tư xây dựng và suất chi phí",
        "clauseCount": 10,
        "content": "Phụ lục VI\nPHƯƠNG PHÁP XÁC ĐỊNH SUẤT VỐN ĐẦU TƯ VÀ SUẤT CHI PHÍ\n(Kèm theo Thông tư số  37/2026/TT-BXD ngày 26/6/2026 của Bộ trưởng Bộ Xây dựng)\nA. XÁC ĐỊNH SUẤT VỐN ĐẦU TƯ XÂY DỰNG ĐỂ CÔNG BỐ\nI. XÁC ĐỊNH SUẤT VỐN ĐẦU TƯ XÂY DỰNG MỚI\n1. Trình tự xác định suất vốn đầu tư\nSuất vốn đầu tư xây dựng được xác định theo các bước như sau:\nBước 1: Lập danh mục loại dự án, công trình xây dựng, lựa chọn đơn vị\ntính để xác định suất vốn đầu tư;\nBước 2: Thu thập số liệu, dữ liệu có liên quan và xây dựng cơ sở dữ liệu\nđể tính toán;\nBước 3: Xử lý số liệu, dữ liệu và xác định suất vốn đầu tư;\nBước 4: Tổng hợp kết quả tính toán, biên soạn suất vốn đầu tư.\n2. Nội dung các bước công việc\n2.1. Lập danh mục loại công trình, dự án xây dựng, lựa chọn đơn vị tính\nđể xác định suất vốn đầu tư;\n- Lập danh mục loại công trình, dự án xây dựng để xác định suất vốn đầu\ntư dựa trên cơ sở: loại công trình, dự án cần xác định suất vốn đầu tư; phân loại,\nphân cấp công trình; tính năng sử dụng, quy mô, hình thức đầu tư; đặc điểm kết\ncấu, công nghệ và yêu cầu kỹ thuật của công trình; quy chuẩn, tiêu chuẩn áp\ndụng, chỉ dẫn kỹ thuật; địa điểm xây dựng công trình.\n- Đơn vị tính suất vốn đầu tư: lựa chọn trên cơ sở tính chất công trình, dự\nán, mục đích, phạm vi sử dụng suất vốn đầu tư trong lập và quản lý chi phí theo\nquy định hiện hành và yêu cầu quản lý"
      },
      {
        "id": "DL26-9BC69E-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (13 trang · 0.52 MB)",
        "clauseCount": 2,
        "content": "- Các lưu ý, điều kiện áp dụng (nếu có)\n1.5. Trường hợp thu thập được dữ liệu của nhiều công trình, hạng mục\ncông trình, hệ thống kỹ thuật, dây chuyền công nghệ thì cần xử lý, quy đổi kết\nquả tính toán tại mục Đ.II.1.4 về cùng mặt bằng giá tại địa điểm, thời điểm xác\nđịnh để quyết định việc sử dụng.\n2. Việc phân tích, đánh giá, hiệu chỉnh, quy đổi (nếu có) để sử dụng chỉ\ntiêu suất chi phí đã tính toán theo hướng dẫn tại mục Đ.II.1 trong xác định sơ bộ\ntổng mức đầu tư, tổng mức đầu tư, dự toán xây dựng thực hiện theo quy định tại\nNghị định quy định chi tiết về quản lý chi phí đầu tư xây dựng và Thông tư\nhướng dẫn một số nội dung, phương pháp xác định và quản lý chi phí đầu tư xây\ndựng và phải đảm bảo rõ ràng từng nội dung chi phí, không trùng lặp trong quá\ntrình tính toán, xác định."
      }
    ]
  },
  {
    "id": "DOC-DL26-74738C35",
    "ssotFileName": "38-2026_TT-BXD_QLCP_DinhMucChiPhiQLDAVaTuVan-PL8.pdf",
    "docNumber": "38/2026/TT-BXD (PL8)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục VIII (TT 38/2026/TT-BXD) — Định mức chi phí quản lý dự án và tư vấn đầu tư xây dựng (48 trang)",
    "shortSummary": "Phụ lục VIII (TT 38/2026/TT-BXD) — Định mức chi phí quản lý dự án và tư vấn đầu tư xây dựng (48 trang)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 2,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G5",
      "G9",
      "G10"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 48 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G5",
      "G9",
      "G10"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_38-2026_TT_BXD_DMQLDAVaTVXD-PL8.pdf · 48 trang · 0.96 MB · SHA256: 74738C35C1DA)",
    "nodes": [
      {
        "id": "DL26-74738C-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục VIII (TT 38/2026/TT-BXD) — Định mức chi phí quản lý dự án và tư vấn đầu tư xây dựng (48 trang)",
        "clauseCount": 10,
        "content": "BỘ XÂY DỰNG\nĐỊNH MỨC CHI PHÍ QUẢN LÝ DỰ ÁN\nVÀ TƯ VẤN XÂY DỰNG\n(Phụ lục VIII kèm theo Thông tư số 38/2026/TT-BXD\nngày 26 tháng 6 năm 2026 của Bộ trưởng Bộ Xây dựng)\nHÀ NỘI - 2026\n1\nPhần I\nTHUYẾT MINH ÁP DỤNG ĐỊNH MỨC CHI PHÍ QUẢN LÝ DỰ ÁN\nVÀ TƯ VẤN XÂY DỰNG\n1. Thuyết minh chung áp dụng định mức chi phí quản lý dự án và tư\nvấn xây dựng\n- Định mức chi phí quản lý dự án và chi phí tư vấn xây dựng ban hành tại\nThông tư này là cơ sở để xác định chi phí quản lý dự án và chi phí tư vấn xây dựng.\n- Đối với dự án, công trình, gói thầu có quy mô chi phí nằm trong khoảng\nquy mô chi phí được quy định tại các bảng định mức ban hành kèm theo Thông\ntư này thì định mức chi phí quản lý dự án và tư vấn xây dựng xác định theo công\nthức sau:\n𝑁𝑡= 𝑁𝑏−𝑁𝑏−𝑁𝑎\n𝐺𝑎−𝐺𝑏\n× (𝐺𝑡−𝐺𝑏)\n(1)\nTrong đó:\n+ Nt : Định mức chi phí quản lý dự án, tư vấn xây dựng theo quy mô chi phí"
      },
      {
        "id": "DL26-74738C-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (48 trang · 0.96 MB)",
        "clauseCount": 2,
        "content": "trong dự toán gói thầu khảo sát xây dựng (tỷ đồng)\n≤ 1\n5\n10\n20\n≥50\nTỷ lệ %\n4,072\n3,541\n3,079\n2,707\n2,381"
      }
    ]
  },
  {
    "id": "DOC-DL26-9A6B29A3",
    "ssotFileName": "38-2026_TT-BXD_QLCP_DinhMucDuToanKhaoSat-PL1.pdf",
    "docNumber": "38/2026/TT-BXD (PL1)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục I (TT 38/2026/TT-BXD) — Định mức dự toán khảo sát xây dựng công trình (142 trang)",
    "shortSummary": "Phụ lục I (TT 38/2026/TT-BXD) — Định mức dự toán khảo sát xây dựng công trình (142 trang)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 15,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G2",
      "G9"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 142 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G2",
      "G9"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_38-2026_TT_BXD_DMDTKhaosat-PL1.pdf · 142 trang · 2.98 MB · SHA256: 9A6B29A30213)",
    "nodes": [
      {
        "id": "DL26-9A6B29-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục I (TT 38/2026/TT-BXD) — Định mức dự toán khảo sát xây dựng công trình (142 trang)",
        "clauseCount": 10,
        "content": "BỘ XÂY DỰNG\nĐỊNH MỨC DỰ TOÁN\nKHẢO SÁT XÂY DỰNG CÔNG TRÌNH\n(Phụ lục I kèm theo Thông tư số 38/2026/TT-BXD\nngày 26 tháng 6 năm 2026 của Bộ trưởng Bộ Xây dựng)\nHÀ NỘI - 2026\n1\nPhần 1\nTHUYẾT MINH\nĐỊNH MỨC DỰ TOÁN KHẢO SÁT XÂY DỰNG CÔNG TRÌNH\n1. Nội dung định mức dự toán khảo sát xây dựng công trình\na. Định mức dự toán khảo sát xây dựng công trình quy định mức hao phí về vật\nliệu, lao động và máy thi công để hoàn thành một đơn vị khối lượng công tác khảo sát\nxây dựng từ khi chuẩn bị đến khi kết thúc công tác khảo sát theo đúng yêu cầu kỹ thuật,\nquy trình, quy phạm quy định.\nb. Định mức dự toán khảo sát xây dựng công trình được lập trên cơ sở quy chuẩn,\ntiêu chuẩn khảo sát xây dựng; yêu cầu quản lý kỹ thuật, thi công, nghiệm thu; mức độ\ntrang bị máy thi công; biện pháp thi công và tiến bộ khoa học kỹ thuật trong khảo sát\nxây dựng.\nc. Định mức dự toán khảo sát xây dựng công trình bao gồm: mã hiệu, tên công\ntác, đơn vị tính, thành phần công việc, quy định áp dụng (nếu có) và bảng các hao phí\nđịnh mức; trong đó:\n- Thành phần công việc quy định nội dung các bước công việc từ khi chuẩn bị\nđến khi hoàn thành công tác khảo sát theo điều kiện kỹ thuật, biện pháp thi công và"
      },
      {
        "id": "DL26-9A6B29-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (142 trang · 2.98 MB)",
        "clauseCount": 2,
        "content": "130\nPhụ lục số 11 Bảng phân cấp khó khăn cho công tác số hóa bản đồ địa hình\n131\nPhụ lục số 12 Bảng phân cấp địa hình cho công tác đo vẽ chi tiết bản đồ địa hình\nở trên cạn\n132\nPhụ lục số 13 Bảng phân cấp địa hình cho công tác đo vẽ chi tiết bản đồ địa hình\nở dưới nước\n133\nPhụ lục số 14 Bảng phân cấp địa chất theo yếu tố ảnh hưởng cho công tác đo vẽ\nbản đồ địa chất công trình\n134"
      }
    ]
  },
  {
    "id": "DOC-DL26-454AD108",
    "ssotFileName": "38-2026_TT-BXD_QLCP_DinhMucDuToanXayDung-PL2.pdf",
    "docNumber": "38/2026/TT-BXD (PL2)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục II (TT 38/2026/TT-BXD) — Định mức dự toán xây dựng công trình (724 trang)",
    "shortSummary": "Phụ lục II (TT 38/2026/TT-BXD) — Định mức dự toán xây dựng công trình (724 trang)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 16,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G10",
      "G13"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 724 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9",
      "G10",
      "G13"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_38-2026_TT_BXD_DMDTXaydung-PL2.pdf · 724 trang · 8.4 MB · SHA256: 454AD1082801)",
    "nodes": [
      {
        "id": "DL26-454AD1-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục II (TT 38/2026/TT-BXD) — Định mức dự toán xây dựng công trình (724 trang)",
        "clauseCount": 10,
        "content": "BỘ XÂY DỰNG\nĐỊNH MỨC DỰ TOÁN XÂY DỰNG CÔNG TRÌNH\n(Phụ lục II kèm theo Thông tư số 38/2026/TT-BXD\nngày 26 tháng 6 năm 2026 của Bộ trưởng Bộ Xây dựng)\nHÀ NỘI - 2026\n1\nPhần 1\nTHUYẾT MINH\nĐỊNH MỨC DỰ TOÁN XÂY DỰNG CÔNG TRÌNH\n1. Nội dung định mức dự toán ttxây dựng công trình\na. Định mức dự toán xây dựng công trình quy định mức hao phí về vật liệu, lao động và máy\nthi công để hoàn thành một đơn vị khối lượng công tác xây dựng từ khi chuẩn bị đến khi kết thúc\ncông tác xây dựng theo đúng yêu cầu kỹ thuật (kể cả những hao phí cần thiết do yêu cầu kỹ thuật và\ntổ chức sản xuất nhằm đảm bảo thi công xây dựng liên tục, đúng quy trình, quy phạm kỹ thuật).\nb. Định mức dự toán xây dựng công trình được lập trên cơ sở các quy chuẩn, tiêu chuẩn xây\ndựng; quy định về quản lý kỹ thuật, thi công, nghiệm thu; mức độ trang bị máy thi công; biện pháp\nthi công phổ biến và tiến bộ khoa học kỹ thuật trong xây dựng.\nc. Định mức dự toán xây dựng công trình bao gồm: mã hiệu, tên công tác, đơn vị tính, thành\nphần công việc, quy định áp dụng (nếu có) và bảng các hao phí định mức; trong đó:\n- Thành phần công việc quy định nội dung các bước công việc từ khi chuẩn bị đến khi hoàn\nthành công tác hoặc kết cấu xây dựng theo điều kiện kỹ thuật, điều kiện thi công và biện pháp thi\ncông cụ thể.\n-  Bảng các hao phí định mức gồm:\n+ Mức hao phí vật liệu: Là số lượng vật liệu chính, vật liệu phụ, các cấu kiện hoặc các bộ "
      },
      {
        "id": "DL26-454AD1-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (724 trang · 8.4 MB)",
        "clauseCount": 2,
        "content": "Trang\nAN.21000 Thi công cọc bê tông xi măng tro bay (CFG) bằng máy búa rung 90 kW\n703\nAN.22000 Thi công cọc bê tông xi măng tro bay (CFG) bằng máy khoan xoay 125\nkNm\n705\nAN.30000 Công tác vận chuyển tro bay, tro xỉ\n707\nAN.31000 Vận chuyển tro bay bằng xe bồn 30 t\n708\nAN.32000 Vận chuyển tro xỉ bãi chứa hoặc hỗn hợp tro xỉ nhiệt điện bằng ôtô tự đổ\n708"
      }
    ]
  },
  {
    "id": "DOC-DL26-8249A4E9",
    "ssotFileName": "38-2026_TT-BXD_QLCP_DinhMucLapDatHTKT-PL3.pdf",
    "docNumber": "38/2026/TT-BXD (PL3)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục III (TT 38/2026/TT-BXD) — Định mức dự toán lắp đặt hệ thống kỹ thuật của công trình (284 trang)",
    "shortSummary": "Phụ lục III (TT 38/2026/TT-BXD) — Định mức dự toán lắp đặt hệ thống kỹ thuật của công trình (284 trang)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 6,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G10"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 284 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9",
      "G10"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_38-2026_TT_BXD_DMDTlapdatHTKT-PL3.pdf · 284 trang · 3.9 MB · SHA256: 8249A4E999C2)",
    "nodes": [
      {
        "id": "DL26-8249A4-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục III (TT 38/2026/TT-BXD) — Định mức dự toán lắp đặt hệ thống kỹ thuật của công trình (284 trang)",
        "clauseCount": 10,
        "content": "BỘ XÂY DỰNG\nĐỊNH MỨC DỰ TOÁN LẮP ĐẶT HỆ THỐNG\nKỸ THUẬT CỦA CÔNG TRÌNH\n(Phụ lục III kèm theo Thông tư số 38/2026/TT-BXD\nngày 26 tháng 6 năm 2026 của Bộ trưởng Bộ Xây dựng)\nHÀ NỘI - 2026\n1\nPhần 1\nTHUYẾT MINH\nĐỊNH MỨC DỰ TOÁN LẮP ĐẶT HỆ THỐNG KỸ THUẬT\nCỦA CÔNG TRÌNH\n1. Nội dung định mức dự toán lắp đặt hệ thống kỹ thuật của công trình\na. Định mức dự toán lắp đặt hệ thống kỹ thuật của công trình quy định mức hao phí về\nvật liệu, lao động và máy thi công để hoàn thành một đơn vị khối lượng công tác lắp đặt từ\nkhi chuẩn bị đến khi kết thúc công tác lắp đặt theo đúng yêu cầu kỹ thuật (kể cả những hao\nphí cần thiết do yêu cầu kỹ thuật và tổ chức sản xuất nhằm đảm bảo thi công xây dựng liên\ntục, đúng quy trình, quy phạm kỹ thuật).\nb. Định mức dự toán lắp đặt hệ thống kỹ thuật của công trình được lập trên cơ sở các\nquy chuẩn, tiêu chuẩn xây dựng; quy định về quản lý kỹ thuật, thi công, nghiệm thu; mức\nđộ trang bị máy thi công; biện pháp thi công phổ biến và tiến bộ khoa học kỹ thuật trong\nlắp đặt.\nc. Định mức dự toán lắp đặt hệ thống kỹ thuật của công trình bao gồm: mã hiệu, tên\ncông tác, đơn vị tính, thành phần công việc, quy định áp dụng (nếu có) và bảng các hao phí\nđịnh mức; trong đó:"
      },
      {
        "id": "DL26-8249A4-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (284 trang · 3.9 MB)",
        "clauseCount": 2,
        "content": "BD.42100 Lắp đặt thiết bị của hệ thống camera\n270\nBD.42200 Lắp đặt bộ điều khiển, bộ chuyển đổi mạch và các đầu báo từ của hệ thống\ncamera\n271\nBD.42300 Lắp đặt đầu báo hồng ngoại (tích cực, thụ động)\n272\nBD.42400 Lắp đặt thiết bị điều khiển báo động\n273\nPhụ lục\nBảng phân cấp đá áp dụng trong công tác khoan giếng\n274"
      }
    ]
  },
  {
    "id": "DOC-DL26-C64E09F7",
    "ssotFileName": "38-2026_TT-BXD_QLCP_DinhMucLapDatMayThietBi-PL4.pdf",
    "docNumber": "38/2026/TT-BXD (PL4)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục IV (TT 38/2026/TT-BXD) — Định mức dự toán lắp đặt máy và thiết bị công nghệ (183 trang)",
    "shortSummary": "Phụ lục IV (TT 38/2026/TT-BXD) — Định mức dự toán lắp đặt máy và thiết bị công nghệ (183 trang)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 25,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G10"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 183 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9",
      "G10"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_38-2026_TT_BXD_DMDTLDThietBi-PL4.pdf · 183 trang · 4.3 MB · SHA256: C64E09F7D03D)",
    "nodes": [
      {
        "id": "DL26-C64E09-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục IV (TT 38/2026/TT-BXD) — Định mức dự toán lắp đặt máy và thiết bị công nghệ (183 trang)",
        "clauseCount": 10,
        "content": "BỘ XÂY DỰNG\nĐỊNH MỨC DỰ TOÁN\nLẮP ĐẶT MÁY VÀ THIẾT BỊ CÔNG NGHỆ\n(Phụ lục IV kèm theo Thông tư số 38/2026/TT-BXD\nngày 26 tháng 6 năm 2026 của Bộ trưởng Bộ Xây dựng)\nHÀ NỘI - 2026\n1\nPhần 1\nTHUYẾT MINH\nĐỊNH MỨC DỰ TOÁN LẮP ĐẶT MÁY VÀ THIẾT BỊ CÔNG NGHỆ\n1. Nội dung định mức dự toán lắp đặt máy và thiết bị công nghệ\na. Định mức dự toán lắp đặt máy và thiết bị công nghệ qui định mức hao phí về vật\nliệu, lao động và máy thi công để hoàn thành một đơn vị khối lượng công tác lắp đặt từ khi\nchuẩn bị, kiểm tra các chi tiết, phụ tùng lắp đặt của máy và thiết bị đến khi lắp đặt hoàn\nthành, kết thúc việc chạy thử kiểm tra chất lượng công tác lắp đặt máy và thiết bị công\nnghệ (nếu có) theo yêu cầu kỹ thuật.\nb. Công tác lắp đặt máy và thiết bị công nghệ trong định mức bao gồm các công việc\nlắp ráp tổ hợp, lắp đặt, điều chỉnh cân bằng phần chính của máy và thiết bị, các phụ tùng,\ncác cụm chi tiết của máy, thiết bị và các vật liệu khác đi theo máy, thiết bị (sau đây gọi\nchung là lắp đặt máy).\nc. Định mức dự toán lắp đặt máy và thiết bị công nghệ bao gồm: mã hiệu, tên công\ntác, đơn vị tính, thành phần công việc, qui định áp dụng (nếu có) và bảng các hao phí định\nmức; trong đó:\n- Thành phần công việc qui định nội dung các bước công việc từ khi chuẩn bị đến khi"
      },
      {
        "id": "DL26-C64E09-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (183 trang · 4.3 MB)",
        "clauseCount": 2,
        "content": "172\nMS.07100\nGia công và bọc tôn tráng kẽm đường ống\n173\nMS.07200\nGia công và bọc tôn tráng kẽm mặt phẳng\n173\nMS.08000\nGia công và bọc nhôm đường ống\n174\nPhụ lục\n175"
      }
    ]
  },
  {
    "id": "DOC-DL26-B440641B",
    "ssotFileName": "38-2026_TT-BXD_QLCP_DinhMucSuaChuaBaoDuong-PL6.pdf",
    "docNumber": "38/2026/TT-BXD (PL6)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục VI (TT 38/2026/TT-BXD) — Định mức dự toán sửa chữa và bảo dưỡng công trình xây dựng (182 trang)",
    "shortSummary": "Phụ lục VI (TT 38/2026/TT-BXD) — Định mức dự toán sửa chữa và bảo dưỡng công trình xây dựng (182 trang)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 9,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G16"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 182 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9",
      "G16"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_38-2026_TT_BXD_DMDTSuaChua-PL6.pdf · 182 trang · 3.59 MB · SHA256: B440641B2A71)",
    "nodes": [
      {
        "id": "DL26-B44064-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục VI (TT 38/2026/TT-BXD) — Định mức dự toán sửa chữa và bảo dưỡng công trình xây dựng (182 trang)",
        "clauseCount": 10,
        "content": "BỘ XÂY DỰNG\nĐỊNH MỨC DỰ TOÁN SỬA CHỮA\nVÀ BẢO DƯỠNG CÔNG TRÌNH XÂY DỰNG\n(Phụ lục VI kèm theo Thông tư số 38/2026/TT-BXD\nngày 26 tháng 6 năm 2026 của Bộ trưởng Bộ Xây dựng)\nHÀ NỘI - 2026\n1\nPhần 1\nTHUYẾT MINH\nĐỊNH MỨC DỰ TOÁN SỬA CHỮA VÀ BẢO DƯỠNG CÔNG TRÌNH XÂY DỰNG\n1. Nội dung định mức dự toán sửa chữa và bảo dưỡng công trình xây dựng\na. Định mức dự toán sửa chữa và bảo dưỡng công trình xây dựng quy định mức hao phí\nvề vật liệu, lao động và máy thi công để hoàn thành một đơn vị khối lượng công tác sửa chữa\nvà bảo dưỡng từ khi chuẩn bị đến khi kết thúc công tác sửa chữa và bảo dưỡng theo đúng yêu\ncầu kỹ thuật.\nb. Định mức dự toán sửa chữa và bảo dưỡng công trình xây dựng được lập trên cơ sở\ncác quy chuẩn, tiêu chuẩn xây dựng; quy định về quản lý kỹ thuật, thi công, nghiệm thu;\nbiện pháp thi công phổ biến và tiến bộ khoa học kỹ thuật trong xây dựng.\nc. Định mức dự toán sửa chữa và bảo dưỡng công trình xây dựng bao gồm: mã hiệu, tên\ncông tác, đơn vị tính, thành phần công việc, qui định áp dụng (nếu có) và bảng các hao phí\nđịnh mức; trong đó:\n- Thành phần công việc qui định nội dung các bước công việc từ khi chuẩn bị đến khi\nhoàn thành công tác sửa chữa và bảo dưỡng theo điều kiện kỹ thuật, điều kiện thi công và\nbiện pháp thi công cụ thể."
      },
      {
        "id": "DL26-B44064-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (182 trang · 3.59 MB)",
        "clauseCount": 2,
        "content": "169\n181\nMã hiệu\nNội dung\nTrang\nSF.10000 Công tác bảo dưỡng công trình đường trong đô thị\n169\nSF.20000 Công tác bảo dưỡng công trình cầu đường bộ trong đô thị\n173\nSF.30000 Công tác bảo dưỡng hệ thống đảm bảo an toàn giao thông và đèn tín\nhiệu giao thông trong đô thị\n177"
      }
    ]
  },
  {
    "id": "DOC-DL26-0A70B321",
    "ssotFileName": "38-2026_TT-BXD_QLCP_DinhMucThiNghiemChuyenNganh-PL5.pdf",
    "docNumber": "38/2026/TT-BXD (PL5)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "QLCP",
    "title": "Phụ lục V (TT 38/2026/TT-BXD) — Định mức dự toán thí nghiệm chuyên ngành xây dựng (146 trang)",
    "shortSummary": "Phụ lục V (TT 38/2026/TT-BXD) — Định mức dự toán thí nghiệm chuyên ngành xây dựng (146 trang)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 6,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "QLCP"
    ],
    "linkedGates": [
      "G9",
      "G12"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 146 trang",
      "LV: QLCP",
      "Phụ lục đính kèm",
      "G9",
      "G12"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_38-2026_TT_BXD_DMDTThiNghiem-PL5.pdf · 146 trang · 2.88 MB · SHA256: 0A70B321B6BB)",
    "nodes": [
      {
        "id": "DL26-0A70B3-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục V (TT 38/2026/TT-BXD) — Định mức dự toán thí nghiệm chuyên ngành xây dựng (146 trang)",
        "clauseCount": 10,
        "content": "BỘ XÂY DỰNG\nĐỊNH MỨC DỰ TOÁN\nTHÍ NGHIỆM CHUYÊN NGÀNH XÂY DỰNG\n(Phụ lục V kèm theo Thông tư số 38/2026/TT-BXD\nngày 26 tháng 6 năm 2026 của Bộ trưởng Bộ Xây dựng)\nHÀ NỘI - 2026\n1\nPhần 1\nTHUYẾT MINH\nĐỊNH MỨC DỰ TOÁN THÍ NGHIỆM CHUYÊN NGÀNH XÂY DỰNG\n1. Nội dung định mức dự toán thí nghiệm chuyên ngành xây dựng\na. Định mức dự toán thí nghiệm chuyên ngành xây dựng (sau đây gọi tắt là Định mức dự\ntoán thí nghiệm) quy định mức hao phí về vật liệu; lao động; máy, thiết bị và dụng cụ thí\nnghiệm để hoàn thành một đơn vị công tác thí nghiệm chuyên ngành xây dựng từ khi chuẩn bị\nđến khi kết thúc công tác thí nghiệm theo đúng yêu cầu tiêu chuẩn kỹ thuật, quy trình, quy\nphạm kỹ thuật.\nb. Định mức dự toán thí nghiệm được lập trên cơ sở các yêu cầu kỹ thuật, tiêu chuẩn, quy\nchuẩn thí nghiệm và những tiến bộ khoa học kỹ thuật trong lĩnh vực thí nghiệm chuyên ngành\nxây dựng (các vật liệu mới, máy và thiết bị thí nghiệm tiên tiến v.v...).\nc. Định mức dự toán thí nghiệm bao gồm: mã hiệu, tên công tác, đơn vị tính, thành phần\ncông việc, quy định áp dụng (nếu có) và bảng các hao phí định mức; trong đó:\n- Thành phần công việc quy định nội dung các bước công việc từ khi chuẩn bị đến khi\nhoàn thành công tác thí nghiệm theo yêu cầu kỹ thuật, tiêu chuẩn, quy chuẩn thí nghiệm và điều\nkiện thí nghiệm cụ thể."
      },
      {
        "id": "DL26-0A70B3-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (146 trang · 2.88 MB)",
        "clauseCount": 2,
        "content": "DC.05000 Thí nghiệm đầm nén\n137\nDC.06000 Thí nghiệm xác định chỉ số CBR của đất, đá dăm (California\nBearing Ratio)\n138\nDC.07000 Thí nghiệm xác định cấu trúc vật liệu bằng kính hiển vi điện tử\nquét\n139\nDC.08000 Thí nghiệm phân tích khoáng trên máy vi nhiệt\n140\nDC.09000 Thí nghiệm phân tích mẫu clo - trong nguyên liệu làm xi măng\n141"
      }
    ]
  },
  {
    "id": "DOC-DL26-DE6C99F5",
    "ssotFileName": "38-2026_TT-BXD_VLXD_DinhMucSuDungVatLieu-PL7.pdf",
    "docNumber": "38/2026/TT-BXD (PL7)",
    "docType": "TT",
    "issuer": "BXD",
    "year": "2026",
    "issueDate": "26/06/2026",
    "effectiveDate": "01/07/2026",
    "industryGroupId": "IND-XAYDUNG-DAUTHAU",
    "subSectorCode": "XD_XAYDUNG",
    "subSectorLabel": "Xây dựng",
    "primaryDomain": "VLXD",
    "title": "Phụ lục VII (TT 38/2026/TT-BXD) — Định mức sử dụng vật liệu xây dựng (180 trang)",
    "shortSummary": "Phụ lục VII (TT 38/2026/TT-BXD) — Định mức sử dụng vật liệu xây dựng (180 trang)",
    "status": "Còn hiệu lực năm 2026",
    "validityPeriod": "Còn hiệu lực",
    "isAmended": false,
    "chapterCount": 4,
    "articleCount": 2,
    "clauseTotalCount": 4,
    "projectAxes": [
      "HTKT",
      "DAN_DUNG",
      "KCN",
      "CCN",
      "FTZ",
      "PPP_BT"
    ],
    "secondaryDomains": [
      "VLXD"
    ],
    "linkedGates": [
      "G9",
      "G12"
    ],
    "linkedQAQC": [
      "QT-01"
    ],
    "tags": [
      "Nguồn: Data_Legal_2026",
      "PDF Native · 180 trang",
      "LV: VLXD",
      "Phụ lục đính kèm",
      "G9",
      "G12"
    ],
    "lineage": "Nạp từ kho thực tế Data_Legal_2026 ([2026]_38-2026_TT_BXD_DMDTVatLieu-PL7.pdf · 180 trang · 2.26 MB · SHA256: DE6C99F53053)",
    "nodes": [
      {
        "id": "DL26-DE6C99-1",
        "level": "Mở đầu",
        "code": "Căn cứ ban hành · Lời mở đầu",
        "title": "Phụ lục VII (TT 38/2026/TT-BXD) — Định mức sử dụng vật liệu xây dựng (180 trang)",
        "clauseCount": 10,
        "content": "BỘ XÂY DỰNG\nĐỊNH MỨC SỬ DỤNG VẬT LIỆU XÂY DỰNG\n(Phụ lục VII kèm theo Thông tư số 38/2026/TT-BXD\nngày 26 tháng 6 năm 2026 của Bộ trưởng Bộ Xây dựng)\nHÀ NỘI - 2026\n1\nPhần 1\nTHUYẾT MINH\nĐỊNH MỨC SỬ DỤNG VẬT LIỆU XÂY DỰNG\nĐịnh mức sử dụng vật liệu trong xây dựng là định mức kinh tế - kỹ thuật quy định\nvề mức hao phí của từng loại vật liệu để cấu thành nên một đơn vị khối lượng công tác\nxây dựng (1m3 tường xây gạch, 1m2 lát gạch ...) hoặc một loại cấu kiện hay kết cấu xây\ndựng (một bộ vì kèo, một kết cấu vì chống lò ...) phù hợp với yêu cầu kỹ thuật, tiêu\nchuẩn, quy phạm thiết kế thi công.\n1. Kết cấu tập định mức sử dụng vật liệu xây dựng\nĐịnh mức sử dụng vật liệu trong xây dựng bao gồm 2 phần và phụ lục kèm theo;\ncụ thể như sau:\nPhần 1: Định mức sử dụng vật liệu\n- Chương I:\nĐịnh mức sử dụng vật liệu trong công tác bê tông và định mức cấp\nphối vật liệu của công trình giao thông.\n- Chương II:  Định mức sử dụng vật liệu trong công tác xây, trát và hoàn thiện.\n- Chương III: Định mức sử dụng vật liệu trong công tác làm giàn giáo.\n- Chương IV: Định mức sử dụng vật liệu trong công tác gia công kết cấu gỗ."
      },
      {
        "id": "DL26-DE6C99-2",
        "level": "Điều",
        "code": "Nội dung chính / Phụ lục",
        "title": "Trích xuất thực tế từ PDF gốc (180 trang · 2.26 MB)",
        "clauseCount": 2,
        "content": "21.5000\nĐịnh mức hao hụt vật liệu trong khâu vận chuyển ngoài công trình\nvà bảo quản tại kho\n130\nPHỤ LỤC\nPhụ lục trọng lượng đơn vị vật liệu\nNhóm vật liệu không kim loại\n130\nNhóm vật liệu kim loại\n135\nQuan hệ đơn vị đo đường kính ống\n163"
      }
    ]
  }
];
