module.exports = {
  create: {
      properties: {
          campaign: {
            type: 'string',
            maxLength: 240,
          },
          title: {
            type: ['string', 'null'],
            maxLength: 560,
          },
          text: {
            type: 'string',
            maxLength: 560,
          },
          platform: {
            type: 'array',
          },
          earliestOrderDate: {
            type: ['string', 'null'],
          },
          latestOrderDate: {
            type: ['string', 'null'],
          },
          numberOfOrdersMin: {
            type: ['number', 'null']
          },
          numberOfOrdersMax: {
            type: ['number', 'null']
          },
          kioskOfLastOrder: {
            type: ['array', 'null'],
          },
          consumerIds: {
            type: ['string', 'null'],
          }
      },
      required: ['campaign', 'text', 'platform']
  },
};
