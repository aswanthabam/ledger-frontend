import React from 'react';
import { FlexWidget, TextWidget, OverlapWidget } from 'react-native-android-widget';

interface SmallWidgetProps {
  totalSpent: string;
  currencySymbol: string;
}

export function SmallWidget({ totalSpent, currencySymbol }: SmallWidgetProps) {
  return (
    <OverlapWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
      }}
    >
      {/* Background Container */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
        }}
      />

      {/* Background decoration circle */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
        }}
      >
        <FlexWidget
          style={{
            height: 60,
            width: 60,
            backgroundColor: '#F6F8F6',
            borderRadius: 30,
            marginTop: -15,
            marginRight: -15,
          }}
        />
      </FlexWidget>

      {/* Main Content */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <TextWidget
          text="Total Spent"
          style={{
            fontSize: 11,
            color: '#9CA3AF',
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text={`${currencySymbol}${totalSpent}`}
          style={{
            fontSize: 26,
            color: '#111827',
            fontWeight: 'bold',
            marginTop: 4,
          }}
        />
      </FlexWidget>

      {/* Add Button (FAB) */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          padding: 8,
        }}
      >
        <FlexWidget
          style={{
            height: 40,
            width: 40,
            backgroundColor: '#030712',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'com.ledger.app://transactions/add' }}
        >
          <TextWidget
            text="+"
            style={{
              fontSize: 20,
              color: '#FFFFFF',
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}
