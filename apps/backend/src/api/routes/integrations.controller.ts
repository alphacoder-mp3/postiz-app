import {Body, Controller, Get, Param, Post} from '@nestjs/common';
import {ioRedis} from "@gitroom/nestjs-libraries/redis/redis.service";
import {ConnectIntegrationDto} from "@gitroom/nestjs-libraries/dtos/integrations/connect.integration.dto";
import {IntegrationManager} from "@gitroom/nestjs-libraries/integrations/integration.manager";
import {IntegrationService} from "@gitroom/nestjs-libraries/database/prisma/integrations/integration.service";
import {GetOrgFromRequest} from "@gitroom/nestjs-libraries/user/org.from.request";
import {Organization} from "@prisma/client";

@Controller('/integrations')
export class IntegrationsController {
    constructor(
        private _integrationManager: IntegrationManager,
        private _integrationService: IntegrationService
    ) {
    }
    @Get('/social/:integration')
    async getIntegrationUrl(
        @Param('integration') integration: string
    ) {
        if (!this._integrationManager.getAllowedSocialsIntegrations().includes(integration)) {
            throw new Error('Integration not allowed');
        }

        const integrationProvider = this._integrationManager.getSocialIntegration(integration);
        const {codeVerifier, state, url} = await integrationProvider.generateAuthUrl();
        await ioRedis.set(`login:${state}`, codeVerifier, 'EX', 300);

        return url;
    }

    @Post('/article/:integration/connect')
    async connectArticle(
        @GetOrgFromRequest() org: Organization,
        @Param('integration') integration: string,
        @Body('code') api: string
    ) {
        if (!this._integrationManager.getAllowedArticlesIntegrations().includes(integration)) {
            throw new Error('Integration not allowed');
        }

        if (!api) {
            throw new Error('Missing api');
        }

        const integrationProvider = this._integrationManager.getArticlesIntegration(integration);
        const {id, name, token} = await integrationProvider.authenticate(api);

        if (!id) {
            throw new Error('Invalid api key');
        }

        return this._integrationService.createIntegration(org.id, name, 'article', String(id), integration, token);
    }

    @Post('/social/:integration/connect')
    async connectSocialMedia(
        @GetOrgFromRequest() org: Organization,
        @Param('integration') integration: string,
        @Body() body: ConnectIntegrationDto
    ) {
        if (!this._integrationManager.getAllowedSocialsIntegrations().includes(integration)) {
            throw new Error('Integration not allowed');
        }

        const getCodeVerifier = await ioRedis.get(`login:${body.state}`);
        if (!getCodeVerifier) {
            throw new Error('Invalid state');
        }

        const integrationProvider = this._integrationManager.getSocialIntegration(integration);
        const {accessToken, expiresIn, refreshToken, id, name} = await integrationProvider.authenticate({
            code: body.code,
            codeVerifier: getCodeVerifier
        });

        if (!id) {
            throw new Error('Invalid api key');
        }

        return this._integrationService.createIntegration(org.id, name, 'social', String(id), integration, accessToken, refreshToken, expiresIn);
    }
}
