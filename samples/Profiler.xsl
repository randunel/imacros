<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:template match="/">
    <html>
      <body style="font-family:verdana">
        <h2>Performance Profile</h2>
        <xsl:apply-templates/>
      </body>
    </html>
  </xsl:template>

  <xsl:template match="Profile">
    <p>
      <xsl:apply-templates select="Macro"/>
    </p>
  </xsl:template>
  
  <xsl:template name="row">
        <xsl:if test="(position() mod 2 = 1)">
            <xsl:attribute name="bgcolor">AliceBlue</xsl:attribute>
        </xsl:if>
        <td style="padding:10px">
            <xsl:value-of select="Line"/>
        </td>
        <td style="font-family: courier; font-size:10pt; padding:10px">
            <xsl:value-of select="String"/>
        </td>
        <td style="padding:10px">
            <xsl:value-of select="StartTime"/>
        </td>
        <td style="padding:10px">
            <xsl:value-of select="EndTime"/>
        </td>
        <td style="padding:10px">
            <xsl:value-of select="ElapsedSeconds"/>
        </td>
        <td style="padding:10px">
            <xsl:value-of select="StatusCode" />
        </td>
        <td style="padding:10px">
            <xsl:value-of select="StatusText" />
        </td>
  </xsl:template>
  
  <xsl:template name="comment">
  <tr style="color: gray">
    <xsl:call-template name="row"/>
    </tr>
  </xsl:template>
  
  <xsl:template name="nocomment">
  <tr>
  <xsl:attribute name="style">
  <xsl:choose>
  <xsl:when test="@timeout_threshold &gt; '99'">
  color: brown;
  </xsl:when>
  <xsl:when test="@timeout_threshold &lt;= '99' and @timeout_threshold &gt; '80'">
  color: red;
  </xsl:when>
  <xsl:when test="@timeout_threshold &lt;= '80' and @timeout_threshold &gt; '50'">
  color: orange;
  </xsl:when>
  <xsl:otherwise>
  color: green;
  </xsl:otherwise>
  </xsl:choose>
  </xsl:attribute>
  <xsl:call-template name="row"/>
  </tr>  
  </xsl:template>
  
  <xsl:template match="Command">
  <xsl:choose>
        <xsl:when test="@type='comment'">
        <xsl:call-template name="comment"/>
        </xsl:when>        
        <xsl:otherwise>
        <xsl:call-template name="nocomment"/>       
        </xsl:otherwise>
      </xsl:choose> 
  </xsl:template>

  <xsl:template match="Macro"> 
  <hr/>
  <div style="width:640px; padding:5px; margin-bottom:10px;
  text-align:left">
    <p style="color:Red">
      Macro: <xsl:value-of select="Name"/> <br/>
      started at <xsl:value-of select="Start"/> <xsl:text> </xsl:text> 
      ended at <xsl:value-of select="End"/><br/>
      duration = <xsl:value-of select="ElapsedSeconds"/> seconds
      <br/>
      status: <xsl:value-of select="Status/Text"/>(<xsl:value-of select="Status/Code"/>)
    </p>
    <table border="0" style ="color:white">
      <tr  style="background-color:navy">
        <th>Line</th>
        <th>Command</th>
        <th>StartTime</th>
        <th>EndTime</th>
        <th>ElapsedSeconds</th>
        <th>StatusCode</th>
        <th>StatusText</th>
      </tr>
      <xsl:apply-templates select="Command"/>
    </table>
    </div>
  </xsl:template>
</xsl:stylesheet>