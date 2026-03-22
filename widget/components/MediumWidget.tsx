import React from 'react';
import { FlexWidget, TextWidget, ColorProp, OverlapWidget, SvgWidget } from 'react-native-android-widget';

interface CategoryItemProps {
  name: string;
  icon: string;
  percentage: number;
  pctChange: number;
  color: ColorProp;
  bgColor: ColorProp;
}

const ICON_MAP: Record<string, string> = {
  food: 'M11,13H13V17H15V13H17V11H11V13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20Z',
  coffee: 'M2,21V19H20V21H2M20,8V5H18V8H20M20,3A2,2 0 0,1 22,5V8A2,2 0 0,1 20,10H18V13A4,4 0 0,1 14,17H8A4,4 0 0,1 4,13V3H20M16,5H6V13A2,2 0 0,0 8,15H14A2,2 0 0,0 16,13V5Z',
  cart: 'M17,18A2,2 0 0,1 19,20A2,2 0 0,1 17,22C15.89,22 15,21.1 15,20C15,18.89 15.89,18 17,18M1,2V4H3L6.6,11.59L5.24,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42A0.25,0.25 0 0,1 7.17,14.75L7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.58 17.3,11.97L20.88,5.5C20.95,5.34 21,5.17 21,5A1,1 0 0,0 20,4H5.21L4.27,2M7,18A2,2 0 0,1 9,20A2,2 0 0,1 7,22C5.89,22 5,21.1 5,20C5,18.89 5.89,18 7,18Z',
  bus: 'M18,11H6V5H18M18,3H6C4.89,3 4,3.89 4,5V16A2,2 0 0,0 6,18V19A1,1 0 0,0 7,20H8A1,1 0 0,0 9,19V18H15V19A1,1 0 0,0 16,20H17A1,1 0 0,0 18,19V18A2,2 0 0,0 20,16V5C20,3.89 19.1,3 18,3M16.5,15A1.5,1.5 0 1,1 18,13.5A1.5,1.5 0 0,1 16.5,15M7.5,15A1.5,1.5 0 1,1 9,13.5A1.5,1.5 0 0,1 7.5,15Z',
  bank: 'M11.5,1L2,6V8H21V6M16,10V17H19V10M2,22H21V19H2M11.5,10V17H14.5V10M7,10V17H10V10',
  'chart-line': 'M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z',
  safe: 'M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M11.5,14.5L10,13L11.5,11.5L13,13L11.5,14.5M16,13A4.5,4.5 0 1,1 11.5,8.5A4.5,4.5 0 0,1 16,13Z',
};

const DEFAULT_PATH = 'M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.11,3 19,3Z';

const CategoryRow = ({ name, icon, percentage, pctChange, color, bgColor }: CategoryItemProps) => {
  const path = ICON_MAP[icon] || DEFAULT_PATH;
  return (
    <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginBottom: 14 }}>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <FlexWidget
            style={{
              height: 30,
              width: 30,
              backgroundColor: bgColor,
              borderRadius: 15,
              marginRight: 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <SvgWidget
              svg={`<svg viewBox="0 0 24 24"><path d="${path}" fill="${color}" /></svg>`}
              style={{ height: 16, width: 16 }}
            />
          </FlexWidget>
          <TextWidget
            text={name}
            style={{ fontSize: 13, fontWeight: 'bold', color: '#111827' }}
          />
        </FlexWidget>

        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          <TextWidget
            text={pctChange > 0 ? `+${pctChange}%` : `${pctChange}%`}
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: pctChange > 0 ? '#EF4444' : '#10B981',
              marginRight: 8,
            }}
          />
          <TextWidget
            text={`${percentage}%`}
            style={{ fontSize: 13, fontWeight: 'bold', color: '#111827' }}
          />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          height: 6,
          width: 'match_parent',
          backgroundColor: '#F3F4F6',
          borderRadius: 3,
          marginTop: 6,
          flexDirection: 'row',
        }}
      >
        <FlexWidget
          style={{
            height: 6,
            flex: Math.max(1, percentage),
            backgroundColor: color,
            borderRadius: 3,
          }}
        />
        <FlexWidget
          style={{
            height: 6,
            flex: Math.max(1, 100 - percentage),
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
};

interface MediumWidgetProps {
  totalSpent: string;
  spendPctChange: number;
  totalInvested: string;
  investPctChange: number;
  categories: {
    name: string;
    icon: string;
    percentage: number;
    pctChange: number;
    color: string;
    bgColor: string;
  }[];
  lastUpdated: string;
  currencySymbol: string;
}

export function MediumWidget({
  totalSpent,
  spendPctChange,
  totalInvested,
  investPctChange,
  categories,
  lastUpdated,
  currencySymbol,
}: MediumWidgetProps) {
  return (
    <OverlapWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
      }}
    >
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: 20,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginBottom: 16 }}>
          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            <TextWidget
              text="TOTAL SPENT"
              style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 'bold' }}
            />
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <TextWidget
                text={`${currencySymbol}${totalSpent}`}
                style={{ fontSize: 22, color: '#111827', fontWeight: 'bold' }}
              />
              <FlexWidget
                style={{
                  marginLeft: 6,
                  backgroundColor: spendPctChange > 0 ? '#FEE2E2' : '#F4F4F4',
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderRadius: 8,
                }}
              >
                <TextWidget
                  text={`${spendPctChange > 0 ? '+' : ''}${spendPctChange}%`}
                  style={{ fontSize: 9, color: spendPctChange > 0 ? '#DC2626' : '#9CA3AF', fontWeight: 'bold' }}
                />
              </FlexWidget>
            </FlexWidget>
          </FlexWidget>

          <FlexWidget style={{ width: 1, height: 36, backgroundColor: '#F3F4F6', marginHorizontal: 12 }} />

          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            <TextWidget
              text="TOTAL INVESTED"
              style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 'bold' }}
            />
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <FlexWidget
                style={{
                  marginRight: 6,
                  backgroundColor: '#ECFDF5',
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderRadius: 8,
                }}
              >
                <TextWidget
                  text={`${investPctChange > 0 ? '+' : ''}${investPctChange}%`}
                  style={{ fontSize: 9, color: '#10B981', fontWeight: 'bold' }}
                />
              </FlexWidget>
              <TextWidget
                text={`${currencySymbol}${totalInvested}`}
                style={{ fontSize: 22, color: '#10B981', fontWeight: 'bold' }}
              />
            </FlexWidget>
          </FlexWidget>
        </FlexWidget>

        <FlexWidget style={{ flexDirection: 'column', flex: 1, width: 'match_parent' }}>
          {categories.slice(0, 2).map((cat, idx) => (
            <CategoryRow key={idx} {...(cat as any)} />
          ))}
        </FlexWidget>

        <TextWidget
          text={`Last updated ${lastUpdated}`}
          style={{ fontSize: 9, color: '#9CA3AF', marginTop: 4 }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          padding: 5,
        }}
      >
        <FlexWidget
          style={{
            height: 44,
            width: 44,
            backgroundColor: '#030712',
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'com.ledger.app://transactions/add' }}
        >
          <TextWidget
            text="+"
            style={{ fontSize: 22, color: '#FFFFFF', fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}
