import { XMLParser } from 'fast-xml-parser';

export const parseXML = (xmlData: string) => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    return parser.parse(xmlData);
};
