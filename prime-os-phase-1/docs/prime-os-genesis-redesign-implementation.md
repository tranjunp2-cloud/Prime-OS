# Prime OS Genesis Redesign Implementation Note

Ngay 2026-04-25, Prime OS full version duoc chuyen sang huong design system tham chieu Genesis cua DESIGN.md:

- Source tham chieu: https://designmd.ai/chef/genesis
- Dinh huong: editorial precision operating shell, sang, phang, ro chu, it bong do.
- Muc tieu: giu Prime OS la control surface nghiep vu, nhung giam cam giac dark/violet dashboard cu va tang kha nang doc/ra quyet dinh.

## Quyet Dinh Thiet Ke

1. Theme mac dinh chuyen sang light.
   - Background: `#FAFAFA`
   - Surface: `#FFFFFF`
   - Primary interaction: `#6366F1`
   - Text primary: `#0A0A0A`
   - Text secondary: `#6B6B6B`
   - Border: `#E8E8EC`

2. Typography doi sang cap font Genesis.
   - Heading/display: General Sans
   - Body/UI: DM Sans
   - Identifier/code: JetBrains Mono

3. Component primitive duoc can lai.
   - Button/input radius: 6px
   - Card radius: 12px
   - Panel radius: 8px khi la metadata panel
   - Static surface khong dung shadow
   - Hover moi co lift/shadow nhe
   - Focus dung indigo ring 3px

4. Shell/navigation duoc lam lai theo Genesis.
   - Header 56px, sticky, backdrop blur, border bottom.
   - Command search la rounded-xl search bar.
   - Sidebar light, active item dung indigo vi day la interactive state.
   - Auth screen bo dark glow/decorative blobs va di theo surface/card light.

## Pham Vi Da Ap Dung

- `app/src/index.css`
- `app/src/App.tsx`
- `app/src/pages/Auth.tsx`
- `app/src/components/layout/AppLayout.tsx`
- `app/src/components/layout/AppSidebar.tsx`
- `app/src/components/ui/button.tsx`
- `app/src/components/ui/card.tsx`
- `app/src/components/ui/input.tsx`
- `app/src/components/ui/badge.tsx`
- `app/src/components/ui/table.tsx`
- `app/src/components/ui/tabs.tsx`
- `app/src/components/ui/command.tsx`
- `app/src/components/system/DataTable.tsx`
- `app/src/components/system/SummaryMetricCard.tsx`

## QA Da Chay

- `npm run build:dev`
- `npm run test -- App.legacy-routes.test.tsx`
- Browser QA headless tren:
  - `/auth`
  - `/overview`
  - `/intelligence/launch-decisions`
  - `/demand/campaign-ops`
  - `/ecom/cos/product-master`
  - `/ecom/cos/product-master/prod_001`
  - `/ecom/cos/oms`
  - `/ecom/cos/fulfillment`

Ket qua:

- Background vao dung `rgb(250, 250, 250)`.
- Body font vao dung `DM Sans`.
- Header vao dung surface trang blur.
- Button radius vao dung 6px.
- Card chinh vao dung 12px tren COS screens.
- Khong phat hien overflow ngang tren route QA.
- Legacy route regression van pass 6/6.

## Viec Chua Lam Trong Pass Nay

Pass nay tap trung vao design system va shell primitives. Chua rewrite tung module business rieng le thanh Genesis-native layout. Cac man Prime operating loop van giu data/logic hien co, nhung da nhan token, typography, surface, radius va control style moi.

